import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/fitter-portal.controller'

const router = Router()
router.use(authMiddleware, requireRole('fitter', 'super_admin'))

router.get('/centre',            ctrl.getCentre)
router.get('/profile',           ctrl.getProfile)
router.put('/profile',           ctrl.putProfile)
router.get('/services',          ctrl.getServices)
router.put('/services',          ctrl.putServices)
router.get('/kpis',              ctrl.getKPIs)
router.get('/jobs',              ctrl.getJobs)
router.get('/jobs/:jobId',       ctrl.getJobDetail)
router.patch('/jobs/:jobId',     ctrl.patchJobStatus)
router.get('/schedule',          ctrl.getSchedule)
router.get('/earnings/summary',  ctrl.getEarningsSummary)
router.get('/earnings',          ctrl.getEarningsHistory)
router.get('/pricing',           ctrl.getPricing)
router.put('/pricing',           ctrl.putPricing)

export default router
