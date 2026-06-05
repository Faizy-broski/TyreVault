import type { Request, Response, NextFunction } from 'express'
import * as PoService from '../services/admin.purchase-orders.service'

type P = Record<string, string>

export async function listPos(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await PoService.listPurchaseOrders({
      status:     String(req.query.status  ?? ''),
      supplierId: String(req.query.supplier ?? ''),
      page:       req.query.page  ? Number(req.query.page)  : 1,
      limit:      req.query.limit ? Number(req.query.limit) : 20,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function getPos(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await PoService.getPurchaseOrder(String((req.params as P).id))
    res.json(data)
  } catch (err) { next(err) }
}

export async function createPos(req: Request, res: Response, next: NextFunction) {
  try {
    const { items = [], ...payload } = req.body
    const data = await PoService.createPurchaseOrder(payload, items)
    res.status(201).json(data)
  } catch (err) { next(err) }
}

export async function patchPos(req: Request, res: Response, next: NextFunction) {
  try {
    await PoService.updatePurchaseOrder(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function deletePos(req: Request, res: Response, next: NextFunction) {
  try {
    await PoService.deletePurchaseOrder(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await PoService.addPoItem(String((req.params as P).id), req.body)
    res.status(201).json(data)
  } catch (err) { next(err) }
}

export async function patchItem(req: Request, res: Response, next: NextFunction) {
  try {
    await PoService.updatePoItem(String((req.params as P).itemId), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    await PoService.deletePoItem(String((req.params as P).itemId))
    res.json({ success: true })
  } catch (err) { next(err) }
}
