import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/fitter.controller'

const router = Router()

// Public: submit onboarding application (no auth required)
router.post('/applications', ctrl.postApplication)

// Admin: review applications
router.get('/applications',              authMiddleware, requireRole('super_admin'), ctrl.getApplications)
router.get('/applications/:id',          authMiddleware, requireRole('super_admin'), ctrl.getApplication)
router.patch('/applications/:id',        authMiddleware, requireRole('super_admin'), ctrl.patchApplication)
router.post('/applications/:id/resend-invite', authMiddleware, requireRole('super_admin'), ctrl.resendInvite)

export default router
