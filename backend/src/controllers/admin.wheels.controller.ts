import type { Request, Response, NextFunction } from 'express'
import * as svc from '../services/admin.wheels.service'

type P = Record<string, string>

const VALID_STYLE_CATEGORIES = ['4x4', 'street', 'luxury', 'commercial']

// ── Wheel Brands ────────────────────────────────────────────────────────────

export async function getWheelBrands(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listWheelBrands())
  } catch (err) { next(err) }
}

export async function postWheelBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { brand_name } = req.body
    if (!brand_name?.trim()) {
      res.status(400).json({ error: 'brand_name is required' }); return
    }
    res.status(201).json(await svc.createWheelBrand(req.body))
  } catch (err) { next(err) }
}

export async function patchWheelBrand(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateWheelBrand(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeWheelBrand(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteWheelBrand(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Wheels (models) ─────────────────────────────────────────────────────────

export async function getWheels(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listWheels({
      search:   String(req.query.search  ?? ''),
      brandId:  String(req.query.brandId ?? ''),
      isActive: req.query.isActive === 'false' ? false : req.query.isActive === 'true' ? true : undefined,
      page:     req.query.page  ? Number(req.query.page)  : 1,
      limit:    req.query.limit ? Number(req.query.limit) : 20,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function getWheel(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getWheel(String((req.params as P).id))
    if (!data) { res.status(404).json({ error: 'Wheel not found' }); return }
    res.json(data)
  } catch (err) { next(err) }
}

export async function postWheel(req: Request, res: Response, next: NextFunction) {
  try {
    const { wheel_brand_id, model_name, model_slug } = req.body
    if (!wheel_brand_id?.trim()) { res.status(400).json({ error: 'wheel_brand_id is required' }); return }
    if (!model_name?.trim())     { res.status(400).json({ error: 'model_name is required' }); return }
    if (!model_slug?.trim())     { res.status(400).json({ error: 'model_slug is required' }); return }
    if (req.body.style_category && !VALID_STYLE_CATEGORIES.includes(req.body.style_category)) {
      res.status(400).json({ error: `style_category must be one of: ${VALID_STYLE_CATEGORIES.join(', ')}` }); return
    }
    res.status(201).json(await svc.createWheel(req.body))
  } catch (err) { next(err) }
}

export async function patchWheel(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body.style_category && !VALID_STYLE_CATEGORIES.includes(req.body.style_category)) {
      res.status(400).json({ error: `style_category must be one of: ${VALID_STYLE_CATEGORIES.join(', ')}` }); return
    }
    await svc.updateWheel(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeWheel(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteWheel(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Wheel Variants ───────────────────────────────────────────────────────────

export async function postWheelVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const { sku, diameter, width, pcd, offset } = req.body
    if (!sku?.trim())               { res.status(400).json({ error: 'sku is required' }); return }
    if (diameter == null)           { res.status(400).json({ error: 'diameter is required' }); return }
    if (width    == null)           { res.status(400).json({ error: 'width is required' }); return }
    if (!pcd?.trim())               { res.status(400).json({ error: 'pcd is required' }); return }
    if (offset   == null)           { res.status(400).json({ error: 'offset is required' }); return }
    res.status(201).json(await svc.addWheelVariant(String((req.params as P).id), req.body))
  } catch (err) { next(err) }
}

export async function patchWheelVariant(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateWheelVariant(String((req.params as P).variantId), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeWheelVariant(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteWheelVariant(String((req.params as P).variantId))
    res.json({ success: true })
  } catch (err) { next(err) }
}
