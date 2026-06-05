import type { Request, Response, NextFunction } from 'express'
import * as InventoryService from '../services/admin.inventory.service'

type P = Record<string, string>

export async function getInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const page       = req.query.page       ? Number(req.query.page)       : 1
    const limit      = req.query.limit      ? Number(req.query.limit)      : 20
    const supplierId = req.query.supplier_id ? String(req.query.supplier_id) : ''
    const status     = (req.query.status as InventoryService.InventoryStatusFilter) ?? 'all'
    const q          = req.query.q          ? String(req.query.q)          : ''

    const result = await InventoryService.getInventoryMappings({ page, limit, supplierId, status, q })
    res.json(result)
  } catch (err) { next(err) }
}

export async function approveMapping(req: Request, res: Response, next: NextFunction) {
  try {
    await InventoryService.approveInventoryMapping(String((req.params as P).mapId))
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeMapping(req: Request, res: Response, next: NextFunction) {
  try {
    await InventoryService.removeInventoryMapping(String((req.params as P).mapId))
    res.json({ success: true })
  } catch (err) { next(err) }
}
