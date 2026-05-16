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

// Brands (quick-create from product form)
router.post('/brands', ctrl.postBrand)


// Collections CRUD
router.get('/collections',      ctrl.getCollections)
router.post('/collections',     ctrl.postCollection)
router.patch('/collections/:id', ctrl.patchCollection)
router.delete('/collections/:id', ctrl.removeCollection)

// Categories CRUD
router.get('/categories',       ctrl.getCategories)
router.post('/categories',      ctrl.postCategory)
router.patch('/categories/:id', ctrl.patchCategory)
router.delete('/categories/:id', ctrl.removeCategory)

// Products CRUD
router.get('/',              ctrl.getProducts)
router.post('/',             ctrl.createProduct)
router.get('/:id',           ctrl.getProduct)
router.put('/:id',           ctrl.updateProduct)
router.delete('/:id',        ctrl.deleteProduct)
router.patch('/:id/publish', ctrl.publishProduct)

// Variants
router.post('/:id/variants',                              ctrl.addVariant)
router.delete('/:id/variants/:variantId',                 ctrl.deleteVariant)
router.patch('/:id/variants/:variantId/stock',            ctrl.updateVariantStock)
router.patch('/:id/variants/:variantId/prices',           ctrl.updateVariantPrices)

// Stock distribution (StockTab)
router.get('/:id/variants/:variantId/stock-detail',       ctrl.getProductStock)
router.put('/:id/variants/:variantId/stock-detail',       ctrl.updateProductStock)

export default router
