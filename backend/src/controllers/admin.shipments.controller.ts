import type { Request, Response } from 'express'
import * as svc from '../services/admin.shipments.service'

type P = Record<string, string>

export async function listShipments(req: Request, res: Response) {
  try {
    const result = await svc.listShipments({
      status:      req.query.status      ? String(req.query.status)      : undefined,
      warehouseId: req.query.warehouseId ? String(req.query.warehouseId) : undefined,
      poId:        req.query.poId        ? String(req.query.poId)        : undefined,
      page:        req.query.page        ? Number(req.query.page)        : 1,
      limit:       req.query.limit       ? Number(req.query.limit)       : 20,
    })
    res.json(result)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export async function getShipment(req: Request, res: Response) {
  try {
    const data = await svc.getShipment(String((req.params as P).id))
    if (!data) return res.status(404).json({ error: 'Shipment not found' })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export async function createShipment(req: Request, res: Response) {
  const { warehouse_id } = req.body
  if (!warehouse_id) return res.status(400).json({ error: 'warehouse_id is required' })
  try {
    const data = await svc.createShipment(req.body)
    res.status(201).json(data)
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function patchShipment(req: Request, res: Response) {
  try {
    await svc.updateShipment(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}

export async function deleteShipment(req: Request, res: Response) {
  try {
    await svc.deleteShipment(String((req.params as P).id))
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
