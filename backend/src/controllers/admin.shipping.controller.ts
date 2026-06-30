import type { Request, Response, NextFunction } from 'express'
import * as ShippingService from '../services/shipping.service'

type P = Record<string, string>

const VALID_METHOD_TYPES = ['own_fleet', 'courier_api', '3pl', 'supplier_direct', 'pickup'] as const

// ── Methods ───────────────────────────────────────────────────────────────────

export async function getShippingMethods(req: Request, res: Response, next: NextFunction) {
  try {
    const includeInactive = req.query.all === 'true'
    const data = await ShippingService.listShippingMethods(includeInactive)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function postShippingMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const { method_name, method_type, api_provider, is_active } = req.body
    if (!method_name?.trim())                            return res.status(400).json({ error: 'method_name is required' })
    if (!VALID_METHOD_TYPES.includes(method_type))       return res.status(400).json({ error: `method_type must be one of: ${VALID_METHOD_TYPES.join(', ')}` })
    const data = await ShippingService.createShippingMethod({ method_name, method_type, api_provider: api_provider ?? null, is_active: is_active !== false })
    res.status(201).json(data)
  } catch (err) { next(err) }
}

export async function patchShippingMethod(req: Request, res: Response, next: NextFunction) {
  try {
    const { method_type } = req.body
    if (method_type !== undefined && !VALID_METHOD_TYPES.includes(method_type)) {
      return res.status(400).json({ error: `method_type must be one of: ${VALID_METHOD_TYPES.join(', ')}` })
    }
    await ShippingService.updateShippingMethod(String((req.params as P).id), req.body)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function removeShippingMethod(req: Request, res: Response, next: NextFunction) {
  try {
    await ShippingService.deleteShippingMethod(String((req.params as P).id))
    res.json({ success: true })
  } catch (err) { next(err) }
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function getShippingQuotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, count } = await ShippingService.listShippingQuotes({
      orderId:     req.query.orderId     ? String(req.query.orderId)     : undefined,
      warehouseId: req.query.warehouseId ? String(req.query.warehouseId) : undefined,
      page:        req.query.page        ? Number(req.query.page)        : 1,
    })
    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) { next(err) }
}

export async function postShippingQuote(req: Request, res: Response, next: NextFunction) {
  try {
    const { warehouse_id, destination_postcode, shipping_method_id, freight_cost, customer_charge } = req.body
    if (!warehouse_id)            return res.status(400).json({ error: 'warehouse_id is required' })
    if (!destination_postcode)    return res.status(400).json({ error: 'destination_postcode is required' })
    if (!shipping_method_id)      return res.status(400).json({ error: 'shipping_method_id is required' })
    if (freight_cost  == null)    return res.status(400).json({ error: 'freight_cost is required' })
    if (customer_charge == null)  return res.status(400).json({ error: 'customer_charge is required' })
    const data = await ShippingService.createShippingQuote(req.body)
    res.status(201).json(data)
  } catch (err) { next(err) }
}
