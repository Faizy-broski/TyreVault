import { Router, type Request, type Response, type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { supabase as db } from '../services/supabase.service'

const router = Router()

const trackingLimiter = rateLimit({
  windowMs:       60_000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many requests — please wait a moment and try again.' },
})

router.post('/track', trackingLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order_number, email } = req.body as { order_number?: string; email?: string }

    if (!order_number || !email) {
      return res.status(400).json({ error: 'order_number and email are required' })
    }

    const { data, error } = await db.rpc('lookup_guest_order', {
      p_order_number: order_number,
      p_email:        email,
    })

    if (error) return next(error)

    // rpc returns an array; empty = not found or email mismatch
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return res.status(404).json({ error: 'Order not found' })

    res.json(row)
  } catch (err) { next(err) }
})

export default router
