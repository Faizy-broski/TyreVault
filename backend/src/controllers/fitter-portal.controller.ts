import type { Request, Response, NextFunction } from 'express'
import * as S from '../services/fitter-portal.service'

type P = Record<string, string>

async function resolvecentreId(req: Request, res: Response): Promise<string | null> {
  const userId = (req as any).user?.id
  if (!userId) { res.status(401).json({ message: 'Unauthorized' }); return null }

  const { data, error } = await S.getCentreByUser(userId)
  if (error || !data) { res.status(404).json({ message: 'Fitment centre not found' }); return null }
  return (data as any).fitment_centre_id
}

export async function getCentre(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })
    const { data, error } = await S.getCentreByUser(userId)
    if (error || !data) return res.status(404).json({ message: 'No fitment centre linked to this account' })
    res.json(data)
  } catch (err) { next(err) }
}

export async function getKPIs(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const kpis = await S.getKPIs(centreId)
    res.json(kpis)
  } catch (err) { next(err) }
}

export async function getJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const status = req.query.status ? String(req.query.status) : undefined
    const result = await S.listJobs(centreId, status)
    const { data, error } = result as unknown as { data: unknown[]; error: unknown }
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function getJobDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const jobId = String((req.params as P).jobId)
    const { data, error } = await S.getJob(centreId, jobId)
    if (error || !data) return res.status(404).json({ message: 'Job not found' })
    res.json(data)
  } catch (err) { next(err) }
}

export async function patchJobStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const jobId = String((req.params as P).jobId)
    const { status, fitter_notes } = req.body

    const allowed = ['accepted', 'in_progress', 'completed', 'cancelled']
    if (!allowed.includes(status)) {
      res.status(400).json({ message: `Invalid status. Allowed: ${allowed.join(', ')}` }); return
    }

    const { error } = await S.updateJobStatus(centreId, jobId, status, fitter_notes)
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const weekStart = String(req.query.weekStart ?? '')
    const weekEnd   = String(req.query.weekEnd   ?? '')
    if (!weekStart || !weekEnd) return res.status(400).json({ message: 'weekStart and weekEnd required' })
    const result = await S.getWeekJobs(centreId, weekStart, weekEnd)
    const { data, error } = result as unknown as { data: unknown[]; error: unknown }
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function getEarningsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const summary = await S.getEarningsSummary(centreId)
    res.json(summary)
  } catch (err) { next(err) }
}

export async function getEarningsHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const result = await S.listEarnings(centreId, {
      status: req.query.status ? String(req.query.status) : undefined,
      search: req.query.search ? String(req.query.search) : undefined,
      page:   req.query.page   ? Number(req.query.page)   : 1,
    })
    const { data, error, count } = result as unknown as { data: unknown[]; error: unknown; count: number | null }
    if (error) return next(error)
    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) { next(err) }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const { data, error } = await S.getProfile(centreId)
    if (error || !data) return res.status(404).json({ message: 'Profile not found' })
    res.json(data)
  } catch (err) { next(err) }
}

export async function putProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const { business_name, contact_name, email, contact_phone, business_number } = req.body
    const { error } = await S.updateProfile(centreId, { business_name, contact_name, email, contact_phone, business_number })
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getServices(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const { data, error } = await S.getServices(centreId)
    if (error || !data) return res.status(404).json({ message: 'Services not found' })
    res.json(data)
  } catch (err) { next(err) }
}

export async function putServices(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const { services_offered, wheel_alignment_price, mobile_fitting_available, opening_hours } = req.body
    const { error } = await S.updateServices(centreId, {
      services_offered:        services_offered ?? [],
      wheel_alignment_price:   wheel_alignment_price ?? null,
      mobile_fitting_available: !!mobile_fitting_available,
      opening_hours:           opening_hours ?? [],
    })
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getPricing(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const result = await S.getPricing(centreId)
    const { data, error } = result as unknown as { data: unknown[]; error: unknown }
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function putPricing(req: Request, res: Response, next: NextFunction) {
  try {
    const centreId = await resolvecentreId(req, res)
    if (!centreId) return
    const { error } = await S.upsertPricing(centreId, req.body.rows ?? [])
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}
