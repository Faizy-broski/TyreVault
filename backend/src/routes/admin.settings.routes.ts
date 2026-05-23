import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.settings.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

router.get('/:key',   ctrl.getSetting)
router.patch('/:key', ctrl.updateSetting)

export default router
