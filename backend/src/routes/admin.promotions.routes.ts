import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole }    from '../middleware/role.middleware'
import * as svc from '../services/promotions.service'
import * as pricing from '../services/pricing.service'

const router = Router()

router.use(authMiddleware)
router.use(requireRole('super_admin'))

// Promotions CRUD
router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1
    const result = await svc.listPromotions(page)
    res.json(result)
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = await svc.createPromotion(req.body)
    res.status(201).json(data)
  } catch (err) { next(err) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const data = await svc.getPromotion(req.params.id)
    res.json(data)
  } catch (err) { next(err) }
})

router.patch('/:id', async (req, res, next) => {
  try {
    await svc.updatePromotion(req.params.id, req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await svc.deletePromotion(req.params.id)
    res.json({ success: true })
  } catch (err) { next(err) }
})

// Pricing / price groups
router.get('/price-groups',              async (_req, res, next) => {
  try { res.json(await pricing.listPriceGroups()) } catch (err) { next(err) }
})

router.get('/price-groups/:groupId',     async (req, res, next) => {
  try { res.json(await pricing.getGroupPrices(req.params.groupId)) } catch (err) { next(err) }
})

router.patch('/price-groups/:groupId',   async (req, res, next) => {
  try {
    const { prices } = req.body
    if (!Array.isArray(prices)) return res.status(400).json({ error: 'prices must be an array' })
    await pricing.bulkUpdatePrices(req.params.groupId, prices)
    res.json({ success: true })
  } catch (err) { next(err) }
})

export default router
