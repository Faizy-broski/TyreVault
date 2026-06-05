import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.suppliers.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Suppliers CRUD
router.get('/',       ctrl.listSuppliers)
router.post('/',      ctrl.createSupplier)
router.get('/:id',    ctrl.getSupplier)
router.put('/:id',    ctrl.updateSupplier)
router.delete('/:id', ctrl.removeSupplier)

// CSV import — multer middleware applied inline
router.post('/:id/import', ctrl.csvUploadMiddleware, ctrl.uploadCsv)

// Mapping review (existing)
router.get('/:id/mappings',                   ctrl.getMappings)
router.patch('/mappings/:mapId/approve',      ctrl.approveMapping)
router.delete('/mappings/:mapId',             ctrl.rejectMapping)
router.patch('/mappings/:mapId/manual',       ctrl.manualMap)

// Split-panel mapping interface
router.get('/:id/mapping-view',               ctrl.getMappingView)
router.post('/:id/mappings/approve-all',      ctrl.approveAllPending)

// Job status polling
router.get('/jobs/:jobId', ctrl.getJobStatus)

// Supplier product stock
router.get('/:id/stock',             ctrl.getSupplierStock)
router.put('/:id/stock',             ctrl.putSupplierStock)
router.delete('/:id/stock/:stockId', ctrl.removeSupplierStock)

export default router
