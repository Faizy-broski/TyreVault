import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.shipping.controller'

const router = Router()
router.use(authMiddleware, requireRole('super_admin'))

// Shipping Methods CRUD
router.get('/methods',        ctrl.getShippingMethods)
router.post('/methods',       ctrl.postShippingMethod)
router.patch('/methods/:id',  ctrl.patchShippingMethod)
router.delete('/methods/:id', ctrl.removeShippingMethod)

// Shipping Quotes
router.get('/quotes',  ctrl.getShippingQuotes)
router.post('/quotes', ctrl.postShippingQuote)

export default router
