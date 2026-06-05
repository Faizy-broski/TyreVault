import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.shipments.controller'

const router = Router()
router.use(authMiddleware)
router.use(requireRole('super_admin'))

router.get('/',     ctrl.listShipments)
router.post('/',    ctrl.createShipment)
router.get('/:id',  ctrl.getShipment)
router.patch('/:id', ctrl.patchShipment)
router.delete('/:id', ctrl.deleteShipment)

export default router
