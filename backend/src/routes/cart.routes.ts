import { Router } from 'express'
import { supabase as db } from '../services/supabase.service'
import { evaluateCartPromotions } from '../services/promotions.service'

const router = Router()

// POST /api/cart/validate
// Checks available_stock per SKU with a single aggregate query.
// No auth required — stock is public information.
router.post('/validate', async (req, res, next) => {
  try {
    const items: { sku_id: string; qty: number }[] = req.body.items ?? []
    if (!items.length) return res.json({ valid: true, errors: [] })

    const skuIds = items.map(i => i.sku_id)

    // Read the denormalized total_available_stock from skus (kept in sync with product_stock by trigger)
    const { data, error } = await db
      .from('skus')
      .select('product_id, total_available_stock')
      .in('product_id', skuIds)

    if (error) return next(error)

    const stockMap = new Map<string, number>()
    for (const row of (data ?? [])) {
      stockMap.set(row.product_id, row.total_available_stock ?? 0)
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

// POST /api/cart/prices
// Returns promotion-adjusted effective price per product_id.
// Body: { items: [{ product_id, quantity, unit_price }] }
router.post('/prices', async (req, res, next) => {
  try {
    const items: { product_id: string; quantity: number; unit_price: number }[] = req.body.items ?? []
    if (!items.length) return res.json({ prices: {} })

    const discounts = await evaluateCartPromotions(items)
    const prices: Record<string, number> = {}
    for (const item of items) {
      prices[item.product_id] = discounts.get(item.product_id) ?? item.unit_price
    }
    res.json({ prices })
  } catch (err) { next(err) }
})

export default router
