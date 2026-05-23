import { supabase as db } from './supabase.service'

export interface CreatePromotionPayload {
  title:          string
  discount_type:  'percent' | 'fixed_amount' | 'bundle'
  discount_value: number
  start_date:     string
  end_date:       string
  applies_to:     'product' | 'pattern' | 'brand' | 'category' | 'customer_group'
  target_id?:     string | null
  minimum_qty?:   number
  is_active?:     boolean
}

const PAGE_SIZE = 20

export async function listPromotions(page = 1) {
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data, count, error } = await db
    .from('promotions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
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
      title:          payload.title,
      discount_type:  payload.discount_type,
      discount_value: payload.discount_value,
      start_date:     payload.start_date,
      end_date:       payload.end_date,
      applies_to:     payload.applies_to,
      target_id:      payload.target_id ?? null,
      minimum_qty:    payload.minimum_qty ?? 1,
      is_active:      payload.is_active ?? true,
    })
    .select('promotion_id')
    .single()

  if (error) throw error
  return data
}

export async function updatePromotion(id: string, patch: Partial<CreatePromotionPayload>) {
  const ALLOWED = new Set(['title','discount_type','discount_value','start_date','end_date','applies_to','target_id','minimum_qty','is_active'])
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (ALLOWED.has(k)) safe[k] = v
  }

  const { error } = await db
    .from('promotions')
    .update(safe)
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
export async function evaluateCartPromotions(
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
): Promise<Map<string, number>> {
  const now = new Date().toISOString().slice(0, 10)

  const { data: promos } = await db
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date',   now)

  if (!promos || promos.length === 0) return new Map()

  // Fetch SKU product/brand/pattern info for matching
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

    for (const promo of (promos as any[])) {
      if (item.quantity < (promo.minimum_qty ?? 1)) continue

      const applies =
        (promo.applies_to === 'product'  && promo.target_id === item.product_id) ||
        (promo.applies_to === 'pattern'  && promo.target_id === sku.pattern_id)  ||
        (promo.applies_to === 'brand'    && promo.target_id === sku.brand_id)    ||
        (promo.applies_to === 'category' /* category matching: skip for now */)  ||
        (promo.applies_to === 'customer_group' /* group-scoped: skip for now */)

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
