import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.wheels.controller'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Wheel Brands
router.get('/brands',        ctrl.getWheelBrands)
router.post('/brands',       ctrl.postWheelBrand)
router.patch('/brands/:id',  ctrl.patchWheelBrand)
router.delete('/brands/:id', ctrl.removeWheelBrand)

// Wheels (models)
router.get('/',    ctrl.getWheels)
router.post('/',   ctrl.postWheel)
router.get('/:id', ctrl.getWheel)
router.patch('/:id',   ctrl.patchWheel)
router.delete('/:id',  ctrl.removeWheel)

// Wheel Variants
router.post('/:id/variants',                    ctrl.postWheelVariant)
router.patch('/:id/variants/:variantId',        ctrl.patchWheelVariant)
router.delete('/:id/variants/:variantId',       ctrl.removeWheelVariant)

export default router
