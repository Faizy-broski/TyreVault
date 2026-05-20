import { Router } from 'express'
import { supabase as db } from '../services/supabase.service'

const router = Router()

// POST /api/cart/validate
// Checks available_stock per SKU with a single aggregate query.
// No auth required — stock is public information.
router.post('/validate', async (req, res, next) => {
  try {
    const items: { sku_id: string; qty: number }[] = req.body.items ?? []
    if (!items.length) return res.json({ valid: true, errors: [] })

    const skuIds = items.map(i => i.sku_id)

    // Sum available_stock across all warehouses per SKU
    const { data, error } = await db
      .from('product_stock')
      .select('product_id, available_stock')
      .in('product_id', skuIds)

    if (error) return next(error)

    // Aggregate per product_id
    const stockMap = new Map<string, number>()
    for (const row of (data ?? [])) {
      stockMap.set(row.product_id, (stockMap.get(row.product_id) ?? 0) + (row.available_stock ?? 0))
    }

    const errors: { sku_id: string; available: number }[] = []
    for (const item of items) {
      const available = stockMap.get(item.sku_id) ?? 0
      if (item.qty > available) {
        errors.push({ sku_id: item.sku_id, available })
      }
    }

    res.json({ valid: errors.length === 0, errors })
  } catch (err) { next(err) }
})

export default router
