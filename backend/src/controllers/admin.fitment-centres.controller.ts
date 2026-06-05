import { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.middleware'
import * as svc from '../services/admin.fitment-centres.service'

type P = Record<string, string>

export async function deleteFitmentCentre(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    await svc.deleteFitmentCentre(id)
    res.json({ success: true })
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string }
    if (err?.status === 404) return res.status(404).json({ error: 'Not found' })
    next(e)
  }
}

export async function checkEmail(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const { email } = req.query as Record<string, string>
    if (!email) return res.status(400).json({ error: 'email query param required' })
    const exists = await svc.emailExists(email)
    res.json({ exists })
  } catch (e) { next(e) }
}

export async function postFitmentCentre(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const { email, password, business_name, full_name, mobile_number, business_number, address } = req.body
    if (!email || !password || !business_name || !full_name || !mobile_number || !business_number || !address)
      return res.status(400).json({ error: 'email, password, full_name, business_name, address, mobile_number and business_number are required' })
    const centre = await svc.createFitmentCentre(req.body)
    res.status(201).json(centre)
  } catch (e) { next(e) }
}

export async function getFitmentCentres(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const { page, search, status } = req.query as Record<string, string>
    const result = await svc.listFitmentCentres({
      page: page ? parseInt(page, 10) : 1,
      search,
      status,
    })
    res.json(result)
  } catch (e) { next(e) }
}

export async function getFitmentCentre(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    const centre = await svc.getFitmentCentre(id)
    if (!centre) return res.status(404).json({ error: 'Not found' })
    res.json(centre)
  } catch (e) { next(e) }
}

export async function patchFitmentCentreStatus(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    const { is_active } = req.body as { is_active: boolean }
    await svc.updateFitmentCentreStatus(id, Boolean(is_active))
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function patchFitmentCentreProfile(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    await svc.updateFitmentCentreProfile(id, req.body as Record<string, unknown>)
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function getCentreJobs(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    const { page, status, search } = req.query as Record<string, string>
    const result = await svc.listCentreJobs(id, {
      page: page ? parseInt(page, 10) : 1,
      status,
      search,
    })
    res.json(result)
  } catch (e) { next(e) }
}

export async function getCentreJob(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id    = String((req.params as P).id)
    const jobId = String((req.params as P).jobId)
    const { data, error } = await svc.getAdminJob(id, jobId)
    if (error || !data) return res.status(404).json({ error: 'Job not found' })
    res.json(data)
  } catch (e) { next(e) }
}

const VALID_JOB_STATUSES = ['pending', 'assigned', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled']

export async function patchCentreJob(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id    = String((req.params as P).id)
    const jobId = String((req.params as P).jobId)
    const { job_status, admin_notes, assigned_by_admin_id } = req.body as Record<string, unknown>
    if (job_status !== undefined && !VALID_JOB_STATUSES.includes(job_status as string)) {
      return res.status(400).json({ error: `job_status must be one of: ${VALID_JOB_STATUSES.join(', ')}` })
    }
    await svc.updateAdminJob(id, jobId, {
      job_status:           job_status as svc.AdminJobStatus | undefined,
      admin_notes:          admin_notes !== undefined ? (admin_notes as string | null) : undefined,
      assigned_by_admin_id: assigned_by_admin_id !== undefined ? (assigned_by_admin_id as string | null) : undefined,
    })
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function getCentreKPIs(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    res.json(await svc.getCentreKPIs(id))
  } catch (e) { next(e) }
}

export async function getCentrePricing(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    res.json(await svc.getCentrePricing(id))
  } catch (e) { next(e) }
}

export async function putCentrePricing(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    const { rows } = req.body as { rows: Parameters<typeof svc.upsertCentrePricing>[1] }
    await svc.upsertCentrePricing(id, rows)
    res.json({ success: true })
  } catch (e) { next(e) }
}

export async function getCentreStats(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    res.json(await svc.getCentreStats(id))
  } catch (e) { next(e) }
}

// ── Payment & Settlement ─────────────────────────────────────────────────────

export async function getPaymentSummary(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    res.json(await svc.getPaymentSummary(String((req.params as P).id)))
  } catch (e) { next(e) }
}

export async function getPaymentHistory(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    const { page, status } = req.query as Record<string, string>
    res.json(await svc.listPaymentHistory(id, {
      page:   page ? parseInt(page, 10) : 1,
      status,
    }))
  } catch (e) { next(e) }
}

export async function getBankDetails(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    res.json(await svc.getBankDetails(String((req.params as P).id)))
  } catch (e) { next(e) }
}

export async function patchBankDetails(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id = String((req.params as P).id)
    await svc.upsertBankDetails(id, req.body as Parameters<typeof svc.upsertBankDetails>[1])
    res.json({ success: true })
  } catch (e) { next(e) }
}

// ── Compliance Documents ─────────────────────────────────────────────────────

export async function getComplianceDocs(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    res.json(await svc.listComplianceDocs(String((req.params as P).id)))
  } catch (e) { next(e) }
}

export async function patchComplianceDoc(
  req: AuthenticatedRequest, res: Response, next: NextFunction
) {
  try {
    const id    = String((req.params as P).id)
    const docId = String((req.params as P).docId)
    await svc.updateComplianceDoc(id, docId, req.body as Parameters<typeof svc.updateComplianceDoc>[2])
    res.json({ success: true })
  } catch (e) { next(e) }
}
