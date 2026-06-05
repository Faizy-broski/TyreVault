import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.purchase-orders.controller'

const router = Router()
router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Purchase orders
router.get('/',       ctrl.listPos)
router.post('/',      ctrl.createPos)
router.get('/:id',    ctrl.getPos)
router.patch('/:id',  ctrl.patchPos)
router.delete('/:id', ctrl.deletePos)

// Line items
router.post('/:id/items',          ctrl.addItem)
router.patch('/:id/items/:itemId', ctrl.patchItem)
router.delete('/:id/items/:itemId', ctrl.deleteItem)

export default router
