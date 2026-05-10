import type { Request, Response, NextFunction } from 'express'
import * as ProductsService from '../services/products.service'

type P = Record<string, string>

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProductsService.listProducts({
      search:  String(req.query.search ?? ''),
      brandId: String(req.query.brandId ?? ''),
      status:  String(req.query.status  ?? ''),
      page:    req.query.page  ? Number(req.query.page)  : 1,
      limit:   req.query.limit ? Number(req.query.limit) : 20,
      sortBy:  (req.query.sortBy as 'updated_at' | 'created_at') ?? 'updated_at',
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProductsService.getProduct(String((req.params as P).id))
    res.json(result)
  } catch (err) { next(err) }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProductsService.createProduct(req.body)
    res.status(201).json(result)
  } catch (err) { next(err) }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.updateProduct(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function publishProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.publishProduct(String((req.params as P).id), req.body.publish === true)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function addVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const productId = await ProductsService.addVariant(
      String((req.params as P).id),
      req.body.variant,
      req.body.pricing
    )
    res.status(201).json({ product_id: productId })
  } catch (err) { next(err) }
}

export async function updateVariantStock(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.updateVariantStock(
      String((req.params as P).variantId),
      req.body.warehouseId,
      req.body.availableStock,
      req.body.lowStockAlert
    )
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getFormMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const [brands, collections, categories] = await Promise.all([
      ProductsService.listBrands(),
      ProductsService.listCollections(),
      ProductsService.listCategories(),
    ])
    res.json({ brands, collections, categories })
  } catch (err) { next(err) }
}
