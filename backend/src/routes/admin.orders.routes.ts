import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.orders.controller'

const router = Router()
router.use(authMiddleware, requireRole('super_admin'))

// Meta endpoints (must be before /:orderId to avoid param conflict)
router.get('/stats',            ctrl.getOrderStats)
router.get('/warehouses',       ctrl.getWarehouses)
router.get('/shipping-methods', ctrl.getShippingMethods)

// Orders list + detail
router.get('/',              ctrl.getOrders)
router.get('/:orderId',      ctrl.getOrder)
router.patch('/:orderId/status', ctrl.patchOrderStatus)

// Fulfillment
router.post('/:orderId/fulfillments',                             ctrl.postFulfillment)
router.patch('/:orderId/shipments/:shipmentId/shipped',           ctrl.patchShipmentShipped)
router.patch('/:orderId/shipments/:shipmentId/delivered',         ctrl.patchShipmentDelivered)

export default router
