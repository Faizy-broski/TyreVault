import { Router } from 'express'
import * as ctrl from '../controllers/admin.addresses.controller'

const router = Router()

// All routes require super_admin — enforced by parent router in index.ts

// Generic address CRUD (works for all owner types)
router.get('/',                       ctrl.listAddresses)   // ?ownerType=X&ownerId=Y
router.post('/',                      ctrl.postAddress)
router.patch('/:addressId/default',   ctrl.setDefault)
router.delete('/:addressId',          ctrl.removeAddress)

export default router
