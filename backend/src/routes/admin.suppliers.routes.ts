import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.suppliers.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Suppliers CRUD
router.get('/',    ctrl.listSuppliers)
router.post('/',   ctrl.createSupplier)
router.get('/:id', ctrl.getSupplier)
router.put('/:id', ctrl.updateSupplier)

// CSV import — multer middleware applied inline
router.post('/:id/import', ctrl.csvUploadMiddleware, ctrl.uploadCsv)

// Mapping review
router.get('/:id/mappings',              ctrl.getMappings)
router.patch('/mappings/:mapId/approve', ctrl.approveMapping)
router.delete('/mappings/:mapId',        ctrl.rejectMapping)
router.patch('/mappings/:mapId/manual',  ctrl.manualMap)

// Job status polling
router.get('/jobs/:jobId', ctrl.getJobStatus)

export default router
