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
      sortBy:  (req.query.sortBy as 'updated_at' | 'created_at' | 'pattern_name' | 'show_on_website' | 'brand_name') ?? 'updated_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') ?? 'desc',
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
    const id = String((req.params as P).id)
    console.log('[updateProduct] id:', id)
    console.log('[updateProduct] brandId received:', req.body.brandId)
    console.log('[updateProduct] body:', JSON.stringify(req.body, null, 2))
    await ProductsService.updateProduct(id, req.body)
    console.log('[updateProduct] success')
    res.json({ success: true })
  } catch (err) {
    console.error('[updateProduct] error:', err)
    next(err)
  }
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

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.deleteProduct(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function deleteVariant(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.deleteVariant(String((req.params as P).variantId))
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function updateVariantPrices(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.updateVariantPrices(
      String((req.params as P).variantId),
      req.body.prices ?? {}
    )
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getProductStock(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ProductsService.getProductStock(String((req.params as P).variantId))
    res.json(result)
  } catch (err) { next(err) }
}

export async function updateProductStock(req: Request, res: Response, next: NextFunction) {
  try {
    const allocations = req.body as { warehouse_id: string; available: number }[]
    if (!Array.isArray(allocations)) {
      res.status(400).json({ error: 'Body must be an array of { warehouse_id, available }' })
      return
    }
    await ProductsService.updateProductStock(String((req.params as P).variantId), allocations)
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

// ── Brands ───────────────────────────────────────────────────────────────────

export async function postBrand(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await ProductsService.createBrand(req.body)) } catch (err) { next(err) }
}


// ── Collections ──────────────────────────────────────────────────────────────

export async function getCollections(req: Request, res: Response, next: NextFunction) {
  try { res.json(await ProductsService.listCollections()) } catch (err) { next(err) }
}

export async function postCollection(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await ProductsService.createCollection(req.body)) } catch (err) { next(err) }
}

export async function patchCollection(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.updateCollection((req.params as P).id, req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeCollection(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.deleteCollection((req.params as P).id)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try { res.json(await ProductsService.listCategories()) } catch (err) { next(err) }
}

export async function postCategory(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await ProductsService.createCategory(req.body)) } catch (err) { next(err) }
}

export async function patchCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.updateCategory((req.params as P).id, req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeCategory(req: Request, res: Response, next: NextFunction) {
  try {
    await ProductsService.deleteCategory((req.params as P).id)
    res.json({ success: true })
  } catch (err) { next(err) }
}
