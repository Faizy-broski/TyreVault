import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/customer-account.controller'

const router = Router()
router.use(authMiddleware, requireRole('customer'))

router.get('/me',                      ctrl.getMe)
router.get('/orders',                  ctrl.getOrders)
router.get('/orders/:orderId',         ctrl.getOrder)
router.patch('/profile',               ctrl.patchProfile)
router.get('/addresses',               ctrl.getAddresses)
router.post('/addresses',              ctrl.postAddress)
router.delete('/addresses/:addressId', ctrl.deleteAddress)

export default router
