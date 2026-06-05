import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.inventory.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

router.get('/',                        ctrl.getInventory)
router.patch('/mappings/:mapId/approve', ctrl.approveMapping)
router.delete('/mappings/:mapId',        ctrl.removeMapping)

export default router
