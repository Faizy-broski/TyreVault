import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.products.controller'
import { csvUploadMiddleware } from '../controllers/admin.suppliers.controller'

const router = Router()

// All admin product routes require authentication + super_admin role
router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Bulk catalog import
router.post('/import/skus',        csvUploadMiddleware, ctrl.importSkus)
router.post('/import/brands',      csvUploadMiddleware, ctrl.importBrands)
router.post('/import/categories',  csvUploadMiddleware, ctrl.importCategories)
router.post('/import/patterns',    csvUploadMiddleware, ctrl.importPatterns)
router.get('/import/jobs/:jobId',  ctrl.getImportJob)

// Form metadata (brands, collections, categories for dropdowns)
router.get('/meta', ctrl.getFormMeta)

// Brands CRUD
router.get('/brands',       ctrl.getBrands)
router.post('/brands',      ctrl.postBrand)
router.patch('/brands/:id', ctrl.patchBrand)
router.delete('/brands/:id', ctrl.removeBrand)

// Patterns CRUD (scoped under brand)
router.get('/brands/:brandId/patterns',                    ctrl.getPatterns)
router.post('/brands/:brandId/patterns',                   ctrl.postPattern)
router.get('/brands/:brandId/patterns/:patternId',         ctrl.getPattern)
router.patch('/brands/:brandId/patterns/:patternId',       ctrl.patchPattern)
router.delete('/brands/:brandId/patterns/:patternId',      ctrl.removePattern)
// Also allow fetching all patterns (unscoped, for dropdowns)
router.get('/patterns',                                    ctrl.getPatterns)


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
router.patch('/:id/variants/:variantId',                  ctrl.patchVariant)
router.delete('/:id/variants/:variantId',                 ctrl.deleteVariant)
router.patch('/:id/variants/:variantId/stock',            ctrl.updateVariantStock)
router.patch('/:id/variants/:variantId/prices',           ctrl.updateVariantPrices)

// Price CRUD (individual rows)
router.post('/:id/variants/:variantId/prices',            ctrl.addPrice)
router.patch('/:id/variants/:variantId/prices/:priceId',  ctrl.updatePriceHandler)
router.delete('/:id/variants/:variantId/prices/:priceId', ctrl.deletePriceHandler)

// product_categories (SKU-level)
router.get('/:id/variants/:variantId/categories',         ctrl.getProductCategories)
router.put('/:id/variants/:variantId/categories',         ctrl.putProductCategories)

// Stock distribution (StockTab)
router.get('/:id/variants/:variantId/stock-detail',                    ctrl.getProductStock)
router.put('/:id/variants/:variantId/stock-detail',                    ctrl.updateProductStock)

// Product-centric supplier mappings (Section 5 of variant form)
router.get('/:id/variants/:variantId/supplier-mappings',               ctrl.getProductSupplierMappings)
router.post('/:id/variants/:variantId/supplier-mappings',              ctrl.addProductSupplierMapping)
router.delete('/:id/variants/:variantId/supplier-mappings/:mapId',     ctrl.removeProductSupplierMapping)

export default router
