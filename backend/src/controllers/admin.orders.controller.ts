import type { Request, Response, NextFunction } from 'express'
import * as OrdersService from '../services/orders.service'

type P = Record<string, string>

export async function getOrderStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await OrdersService.getOrderStats()
    res.json(stats)
  } catch (err) { next(err) }
}

export async function patchOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { error } = await OrdersService.updateOrderStatus(
      String((req.params as P).orderId),
      req.body,
    )
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await OrdersService.listOrders({
      search:            String(req.query.search            ?? ''),
      paymentStatus:     String(req.query.paymentStatus     ?? ''),
      fulfillmentStatus: String(req.query.fulfillmentStatus ?? ''),
      page:              req.query.page ? Number(req.query.page) : 1,
    })
    const { data, error, count } = result as unknown as { data: unknown[]; error: unknown; count: number | null }
    if (error) return next(error)
    res.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) { next(err) }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await OrdersService.getOrder(String((req.params as P).orderId))
    if (error) return next(error)
    res.json(data)
  } catch (err) { next(err) }
}

export async function postFulfillment(req: Request, res: Response, next: NextFunction) {
  try {
    const { error, shipmentId } = await OrdersService.createFulfillment(
      String((req.params as P).orderId),
      req.body
    )
    if (error) return next(error)
    res.status(201).json({ shipment_id: shipmentId })
  } catch (err) { next(err) }
}

export async function patchShipmentShipped(req: Request, res: Response, next: NextFunction) {
  try {
    const { error } = await OrdersService.markShipped(
      String((req.params as P).orderId),
      String((req.params as P).shipmentId),
      req.body
    )
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function patchShipmentDelivered(req: Request, res: Response, next: NextFunction) {
  try {
    const { error } = await OrdersService.markDelivered(
      String((req.params as P).orderId),
      String((req.params as P).shipmentId)
    )
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export async function getWarehouses(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await OrdersService.listWarehouses()
    const { data, error } = result as unknown as { data: unknown[] | null; error: unknown }
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function getShippingMethods(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await OrdersService.listShippingMethods()
    const { data, error } = result as unknown as { data: unknown[] | null; error: unknown }
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}
