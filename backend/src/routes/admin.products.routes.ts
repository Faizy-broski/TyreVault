import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.products.controller'

const router = Router()

// All admin product routes require authentication + super_admin role
router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Form metadata (brands, collections, categories for dropdowns)
router.get('/meta', ctrl.getFormMeta)

// Products CRUD
router.get('/',           ctrl.getProducts)
router.post('/',          ctrl.createProduct)
router.get('/:id',        ctrl.getProduct)
router.put('/:id',        ctrl.updateProduct)
router.patch('/:id/publish', ctrl.publishProduct)

// Variants
router.post('/:id/variants',                         ctrl.addVariant)
router.patch('/:id/variants/:variantId/stock',       ctrl.updateVariantStock)

export default router
