import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/role.middleware'
import * as ctrl from '../controllers/admin.customers.controller'

const router = Router()
router.use(authMiddleware, requireRole('super_admin'))

// ── Customer Groups (MUST be before /:id to avoid shadowing) ──────────────
router.get('/groups/list',                          ctrl.getGroups)
router.post('/groups',                              ctrl.postGroup)
router.get('/groups/:id',                           ctrl.getGroup)
router.patch('/groups/:id',                         ctrl.patchGroup)
router.delete('/groups/:id',                        ctrl.removeGroup)
router.put('/groups/:id/members/:customerId',        ctrl.putGroupMember)
router.delete('/groups/:id/members/:customerId',    ctrl.deleteGroupMember)

// ── Customers ──────────────────────────────────────────────────────────────
router.get('/stats',                                ctrl.getCustomerStats)
router.get('/',                                     ctrl.getCustomers)
router.post('/',                                    ctrl.postCustomer)
router.get('/:id',                                  ctrl.getCustomer)
router.patch('/:id',                                ctrl.patchCustomer)
router.delete('/:id',                               ctrl.removeCustomer)

// ── Addresses ──────────────────────────────────────────────────────────────
router.post('/:id/addresses',                       ctrl.postAddress)
router.delete('/:id/addresses/:addressId',          ctrl.removeAddress)

// ── Customer ↔ Group membership ────────────────────────────────────────────
router.put('/:id/groups/:groupId',                  ctrl.putCustomerGroup)
router.delete('/:id/groups/:groupId',               ctrl.deleteCustomerGroup)

export default router
