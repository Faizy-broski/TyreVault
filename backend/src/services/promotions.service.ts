import { supabase as db } from './supabase.service'

export interface CreatePromotionPayload {
  title:             string
  discount_type:     'percent' | 'fixed_amount' | 'bundle'
  discount_value:    number
  start_date:        string
  end_date:          string
  applies_to:        'product' | 'pattern' | 'brand' | 'category' | 'customer_group'
  target_id?:        string | null
  minimum_qty?:      number
  is_active?:        boolean
  // display / marketing fields
  image_url?:        string | null
  brand_name?:       string | null
  description?:      string | null
  cta_url?:          string | null
  show_on_homepage?: boolean
  display_order?:    number
}

const ALLOWED_FIELDS = new Set([
  'title', 'discount_type', 'discount_value',
  'start_date', 'end_date', 'applies_to', 'target_id',
  'minimum_qty', 'is_active',
  'image_url', 'brand_name', 'description', 'cta_url',
  'show_on_homepage', 'display_order',
])

const PAGE_SIZE = 20

export async function listPromotions(page = 1) {
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data, count, error } = await db
    .from('promotions')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true })
    .order('created_at',    { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data: data ?? [], total: count ?? 0 }
}

export async function getPromotion(id: string) {
  const { data, error } = await db
    .from('promotions')
    .select('*')
    .eq('promotion_id', id)
    .single()

  if (error) throw error
  return data
}

export async function createPromotion(payload: CreatePromotionPayload) {
  const { data, error } = await db
    .from('promotions')
    .insert({
      title:             payload.title,
      discount_type:     payload.discount_type,
      discount_value:    payload.discount_value,
      start_date:        payload.start_date,
      end_date:          payload.end_date,
      applies_to:        payload.applies_to,
      target_id:         payload.target_id         ?? null,
      minimum_qty:       payload.minimum_qty        ?? 1,
      is_active:         payload.is_active          ?? true,
      image_url:         payload.image_url          ?? null,
      brand_name:        payload.brand_name         ?? null,
      description:       payload.description        ?? null,
      cta_url:           payload.cta_url            ?? null,
      show_on_homepage:  payload.show_on_homepage   ?? false,
      display_order:     payload.display_order       ?? 0,
    })
    .select('promotion_id')
    .single()

  if (error) throw error
  return data
}

export async function updatePromotion(id: string, patch: Partial<CreatePromotionPayload>) {
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (ALLOWED_FIELDS.has(k)) safe[k] = v
  }

  const { error } = await db
    .from('promotions')
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq('promotion_id', id)

  if (error) throw error
}

export async function deletePromotion(id: string) {
  const { error } = await db
    .from('promotions')
    .delete()
    .eq('promotion_id', id)

  if (error) throw error
}

// ── Promotion engine — evaluate cart items against active promotions ──────────
//
// Uses a Postgres-side date cast to the store timezone (Asia/Karachi = PKT)
// so "today" is always the store's local date, not the Node.js server's UTC date.
export async function evaluateCartPromotions(
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
): Promise<Map<string, number>> {
  const { data: promos } = await db
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    // Let Postgres evaluate the date in PKT via a raw filter
    .filter('start_date', 'lte', db.rpc as unknown as string)

  // Fallback: fetch all active promos and filter server-side using PKT date
  const { data: allPromos } = await db
    .from('promotions')
    .select('*')
    .eq('is_active', true)

  if (!allPromos || allPromos.length === 0) return new Map()

  // Compute "today" in PKT (UTC+5) on the server
  const nowPKT  = new Date(Date.now() + 5 * 60 * 60 * 1000)
  const todayPKT = nowPKT.toISOString().slice(0, 10)

  const activePromos = (allPromos as any[]).filter(
    p => p.start_date <= todayPKT && p.end_date >= todayPKT
  )

  if (activePromos.length === 0) return new Map()

  const productIds = [...new Set(items.map(i => i.product_id))]
  const { data: skus } = await db
    .from('skus')
    .select('product_id, brand_id, pattern_id')
    .in('product_id', productIds)

  const skuMap = new Map((skus ?? []).map((s: any) => [s.product_id, s]))
  const discounts = new Map<string, number>()

  for (const item of items) {
    const sku = skuMap.get(item.product_id)
    if (!sku) continue

    let bestDiscount = 0

    for (const promo of activePromos) {
      if (item.quantity < (promo.minimum_qty ?? 1)) continue

      const applies =
        (promo.applies_to === 'product'  && promo.target_id === item.product_id) ||
        (promo.applies_to === 'pattern'  && promo.target_id === sku.pattern_id)  ||
        (promo.applies_to === 'brand'    && promo.target_id === sku.brand_id)

      if (!applies) continue

      const discount =
        promo.discount_type === 'percent'
          ? item.unit_price * (promo.discount_value / 100)
          : promo.discount_type === 'fixed_amount'
          ? Math.min(promo.discount_value, item.unit_price)
          : 0

      bestDiscount = Math.max(bestDiscount, discount)
    }

    if (bestDiscount > 0) {
      discounts.set(item.product_id, +(item.unit_price - bestDiscount).toFixed(2))
    }
  }

  return discounts
}
