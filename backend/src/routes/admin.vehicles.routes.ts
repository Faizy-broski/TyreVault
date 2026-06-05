import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.vehicles.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Dropdown helpers
router.get('/makes',  ctrl.getMakes)
router.get('/models', ctrl.getModels)

// Vehicle CRUD
router.get('/',    ctrl.getVehicles)
router.post('/',   ctrl.postVehicle)
router.get('/:id', ctrl.getVehicle)
router.patch('/:id',  ctrl.patchVehicle)
router.delete('/:id', ctrl.removeVehicle)

// Tyre fitments
router.post('/:id/tyre-fitments',                ctrl.postTyreFitment)
router.patch('/:id/tyre-fitments/:fitmentId',    ctrl.patchTyreFitment)
router.delete('/:id/tyre-fitments/:fitmentId',   ctrl.removeTyreFitment)

// Wheel fitments
router.post('/:id/wheel-fitments',               ctrl.postWheelFitment)
router.patch('/:id/wheel-fitments/:fitmentId',   ctrl.patchWheelFitment)
router.delete('/:id/wheel-fitments/:fitmentId',  ctrl.removeWheelFitment)

export default router
