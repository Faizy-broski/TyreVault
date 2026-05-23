import { Router } from 'express'
import { createOrder } from '../services/orders.service'

const router = Router()

// POST /api/orders
// Creates an order after Stripe payment succeeds on the storefront.
router.post('/', async (req, res, next) => {
  try {
    const {
      customer,
      items,
      shipping_address,
      fitment_centre_id,
      booking_slot,
      stripe_payment_intent_id,
      total_amount,
    } = req.body

    if (!customer?.email || !items?.length || !shipping_address || !stripe_payment_intent_id || !total_amount) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await createOrder({
      customer,
      items,
      shipping_address,
      fitment_centre_id: fitment_centre_id ?? null,
      booking_slot:      booking_slot      ?? null,
      stripe_payment_intent_id,
      total_amount,
    })

    if (error) return next(error)
    res.status(201).json(data)
  } catch (err) { next(err) }
})

export default router
