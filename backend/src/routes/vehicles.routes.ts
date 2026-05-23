import { Router } from 'express'
import { supabase as db } from '../services/supabase.service'
import { redis } from '../services/redis.service'

const router = Router()

// GET /api/vehicles/makes
router.get('/makes', async (_req, res, next) => {
  try {
    const { data, error } = await db
      .from('vehicles')
      .select('make')
      .order('make')

    if (error) return next(error)
    const makes = [...new Set((data ?? []).map((r: any) => r.make))].sort()
    res.json(makes)
  } catch (err) { next(err) }
})

// GET /api/vehicles/models?make=X
router.get('/models', async (req, res, next) => {
  try {
    const { make } = req.query
    if (!make) return res.status(400).json({ error: 'make is required' })

    const { data, error } = await db
      .from('vehicles')
      .select('model')
      .eq('make', make as string)
      .order('model')

    if (error) return next(error)
    const models = [...new Set((data ?? []).map((r: any) => r.model))].sort()
    res.json(models)
  } catch (err) { next(err) }
})

// GET /api/vehicles/years?make=X&model=Y
router.get('/years', async (req, res, next) => {
  try {
    const { make, model } = req.query
    if (!make || !model) return res.status(400).json({ error: 'make and model are required' })

    const { data, error } = await db
      .from('vehicles')
      .select('year_from, year_to')
      .eq('make', make as string)
      .eq('model', model as string)

    if (error) return next(error)

    const years = new Set<number>()
    for (const row of (data ?? []) as any[]) {
      const from = row.year_from
      const to   = row.year_to ?? new Date().getFullYear()
      for (let y = from; y <= to; y++) years.add(y)
    }
    res.json([...years].sort((a, b) => b - a))
  } catch (err) { next(err) }
})

// GET /api/vehicles/variants?make=X&model=Y&year=Z
router.get('/variants', async (req, res, next) => {
  try {
    const { make, model, year } = req.query
    if (!make || !model || !year) return res.status(400).json({ error: 'make, model and year are required' })

    const yr = parseInt(year as string, 10)

    const { data, error } = await db
      .from('vehicles')
      .select('vehicle_id, variant, series, body_type')
      .eq('make', make as string)
      .eq('model', model as string)
      .lte('year_from', yr)
      .or(`year_to.is.null,year_to.gte.${yr}`)
      .order('variant')

    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
})

// GET /api/vehicles/fitment?variantId=X
// Returns compatible tyre front_size values for the given vehicle.
// Cached in Redis 24 hours.
router.get('/fitment', async (req, res, next) => {
  try {
    const { variantId } = req.query
    if (!variantId) return res.status(400).json({ error: 'variantId is required' })

    const cacheKey = `fitment:${variantId}`
    const cached   = await redis?.get<any>(cacheKey)
    if (cached) return res.json(cached)

    const { data, error } = await db
      .from('vehicle_tyre_fitments')
      .select('front_size, rear_size, is_staggered, notes')
      .eq('vehicle_id', variantId as string)

    if (error) return next(error)

    const result = data ?? []
    await redis?.set(cacheKey, result, { ex: 86400 }) // 24h
    res.json(result)
  } catch (err) { next(err) }
})

export default router
