import type { Request, Response, NextFunction } from 'express'
import * as FitterService from '../services/fitter.service'

type P = Record<string, string>

export async function postApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await FitterService.submitApplication(req.body)
    if (error) return next(error)
    res.status(201).json({ id: (data as any).id })
  } catch (err) { next(err) }
}

export async function getApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await FitterService.listApplications({
      status: String(req.query.status ?? ''),
      page:   req.query.page ? Number(req.query.page) : 1,
    })
    const { data, error, count } = result as unknown as { data: unknown[]; error: unknown; count: number | null }
    if (error) return next(error)
    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) { next(err) }
}

export async function getApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await FitterService.getApplication(String((req.params as P).id))
    if (error) return next(error)
    res.json(data)
  } catch (err) { next(err) }
}

export async function resendInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { error } = await FitterService.resendFitterInvite(String((req.params as P).id))
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function patchApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, adminNotes } = req.body
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'status must be approved or rejected' })
    }
    const { error } = await FitterService.reviewApplication(
      String((req.params as P).id),
      status,
      adminNotes,
      (req as any).user?.id
    )
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}
