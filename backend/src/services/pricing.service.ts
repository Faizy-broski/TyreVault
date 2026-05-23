import { supabase as db } from './supabase.service'

export async function listPriceGroups() {
  const { data, error } = await db
    .from('customer_groups')
    .select('group_id, group_name, can_view_wholesale, customer_count')
    .order('group_name')

  if (error) throw error
  return data ?? []
}

export async function getGroupPrices(groupId: string) {
  const { data, error } = await db
    .from('product_prices')
    .select(`
      price_id,
      product_id,
      price_type,
      price_ex_gst,
      price_inc_gst,
      is_active,
      skus ( sku, tyre_size_display, patterns ( pattern_name, brands ( brand_name ) ) )
    `)
    .eq('customer_group_id', groupId)
    .eq('is_active', true)
    .order('price_type')

  if (error) throw error
  return data ?? []
}

export async function bulkUpdatePrices(
  groupId: string,
  prices: Array<{ product_id: string; price_ex_gst: number; price_inc_gst: number; price_type: string }>
) {
  const upserts = prices.map(p => ({
    customer_group_id: groupId,
    product_id:        p.product_id,
    price_type:        p.price_type,
    price_ex_gst:      p.price_ex_gst,
    price_inc_gst:     p.price_inc_gst,
    is_active:         true,
  }))

  const { error } = await db
    .from('product_prices')
    .upsert(upserts, { onConflict: 'product_id,price_type,customer_group_id' })

  if (error) throw error
}
