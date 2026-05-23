import { Router } from 'express'
import Stripe from 'stripe'
import { supabase as db } from '../services/supabase.service'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// POST /api/stripe/payment-intent
// Creates a PaymentIntent for the checkout total.
// amount is in AUD cents (already calculated by the frontend from cart).
router.post('/payment-intent', async (req, res, next) => {
  try {
    const { amount, order_ref } = req.body as { amount: number; order_ref?: string }

    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Invalid amount — minimum 50 cents AUD' })
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency:            'aud',
      automatic_payment_methods: { enabled: true },
      metadata:            { order_ref: order_ref ?? '' },
    })

    res.json({ clientSecret: intent.client_secret })
  } catch (err) { next(err) }
})

// GET /api/stripe/fitment-centres
// Public list of approved fitment centres for checkout fitter selection.
// Optional ?postcode= filter (future: distance sort via lat/lng).
router.get('/fitment-centres', async (_req, res, next) => {
  try {
    const { data, error } = await db
      .from('fitment_centres')
      .select(`
        fitment_centre_id,
        business_name,
        contact_phone,
        fitting_price,
        wheel_alignment_price,
        mobile_fitting_available,
        opening_hours,
        addresses ( address_line1, suburb, state, postcode )
      `)
      .eq('is_active', true)
      .order('business_name')

    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
})

export default router
