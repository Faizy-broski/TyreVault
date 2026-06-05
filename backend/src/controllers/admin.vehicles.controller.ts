import type { Request, Response, NextFunction } from 'express'
import * as svc from '../services/admin.vehicles.service'

type P = Record<string, string>

// ── Vehicles ────────────────────────────────────────────────────────────────

export async function getVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await svc.listVehicles({
      search: String(req.query.search ?? ''),
      make:   String(req.query.make   ?? ''),
      model:  String(req.query.model  ?? ''),
      page:   req.query.page  ? Number(req.query.page)  : 1,
      limit:  req.query.limit ? Number(req.query.limit) : 50,
    })
    res.json(result)
  } catch (err) { next(err) }
}

export async function getVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await svc.getVehicle(String((req.params as P).id))
    if (!data) { res.status(404).json({ error: 'Vehicle not found' }); return }
    res.json(data)
  } catch (err) { next(err) }
}

export async function postVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    const { make, model, year_from } = req.body
    if (!make?.trim())    { res.status(400).json({ error: 'make is required' }); return }
    if (!model?.trim())   { res.status(400).json({ error: 'model is required' }); return }
    if (year_from == null){ res.status(400).json({ error: 'year_from is required' }); return }
    res.status(201).json(await svc.createVehicle(req.body))
  } catch (err) { next(err) }
}

export async function patchVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.updateVehicle(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeVehicle(req: Request, res: Response, next: NextFunction) {
  try {
    await svc.deleteVehicle(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getMakes(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await svc.listVehicleMakes())
  } catch (err) { next(err) }
}

export async function getModels(req: Request, res: Response, next: NextFunction) {
  try {
    const { make } = req.query
    if (!make) { res.status(400).json({ error: 'make is required' }); return }
    res.json(await svc.listVehicleModels(String(make)))
  } catch (err) { next(err) }
}

// ── Tyre Fitments ────────────────────────────────────────────────────────────

export async function postTyreFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = String((req.params as P).id)
    const { front_size, is_staggered } = req.body
    if (!front_size?.trim())  { res.status(400).json({ error: 'front_size is required' }); return }
    if (is_staggered == null) { res.status(400).json({ error: 'is_staggered is required' }); return }
    res.status(201).json(await svc.addTyreFitment(vehicleId, req.body))
  } catch (err) { next(err) }
}

export async function patchTyreFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: vehicleId, fitmentId } = req.params as P
    await svc.updateTyreFitment(fitmentId, vehicleId, req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeTyreFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: vehicleId, fitmentId } = req.params as P
    await svc.deleteTyreFitment(fitmentId, vehicleId)
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Wheel Fitments ───────────────────────────────────────────────────────────

export async function postWheelFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = String((req.params as P).id)
    const { pcd } = req.body
    if (!pcd?.trim()) { res.status(400).json({ error: 'pcd is required' }); return }
    res.status(201).json(await svc.addWheelFitment(vehicleId, req.body))
  } catch (err) { next(err) }
}

export async function patchWheelFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: vehicleId, fitmentId } = req.params as P
    await svc.updateWheelFitment(fitmentId, vehicleId, req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeWheelFitment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: vehicleId, fitmentId } = req.params as P
    await svc.deleteWheelFitment(fitmentId, vehicleId)
    res.json({ success: true })
  } catch (err) { next(err) }
}
