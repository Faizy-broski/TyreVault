import { Router } from 'express'
import { authMiddleware }  from '../middleware/auth.middleware'
import { requireRole }     from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.fitment-centres.controller'

const router = Router()
router.use(authMiddleware, requireRole('super_admin'))

router.get('/',               ctrl.getFitmentCentres)
router.get('/:id',            ctrl.getFitmentCentre)
router.patch('/:id/status',   ctrl.patchFitmentCentreStatus)
router.patch('/:id/profile',  ctrl.patchFitmentCentreProfile)
router.get('/:id/jobs',       ctrl.getCentreJobs)
router.get('/:id/kpis',       ctrl.getCentreKPIs)
router.get('/:id/pricing',    ctrl.getCentrePricing)
router.put('/:id/pricing',    ctrl.putCentrePricing)
router.get('/:id/stats',      ctrl.getCentreStats)

// Payment & Settlement
router.get('/:id/payments/summary', ctrl.getPaymentSummary)
router.get('/:id/payments',         ctrl.getPaymentHistory)
router.get('/:id/bank-details',     ctrl.getBankDetails)
router.patch('/:id/bank-details',   ctrl.patchBankDetails)

// Compliance Documents
router.get('/:id/compliance',             ctrl.getComplianceDocs)
router.patch('/:id/compliance/:docId',    ctrl.patchComplianceDoc)

export default router
