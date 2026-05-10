import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/fitter-portal.controller'

const router = Router()
router.use(authMiddleware, requireRole('fitter'))

router.get('/centre',            ctrl.getCentre)
router.get('/kpis',              ctrl.getKPIs)
router.get('/jobs',              ctrl.getJobs)
router.patch('/jobs/:jobId',     ctrl.patchJobStatus)
router.get('/schedule',          ctrl.getSchedule)
router.get('/earnings/summary',  ctrl.getEarningsSummary)
router.get('/earnings',          ctrl.getEarningsHistory)
router.get('/pricing',           ctrl.getPricing)
router.put('/pricing',           ctrl.putPricing)

export default router
