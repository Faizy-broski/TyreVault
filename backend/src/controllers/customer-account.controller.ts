import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.middleware'
import * as svc from '../services/customer-account.service'

type P = Record<string, string>

// ── Me ────────────────────────────────────────────────────────────────────────

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data, error } = await svc.getCustomerByProfileId(req.user!.id)
    if (error || !data) return res.status(404).json({ error: 'Customer account not found' })
    res.json(data)
  } catch (err) { next(err) }
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    const page = req.query.page ? Number(req.query.page) : 1
    const { data, error, count } = await svc.listCustomerOrders(customer.customer_id, page) as any

    if (error) return next(error)
    const orders = (data ?? []).map((o: any) => ({
      ...o,
      item_count: (o.order_items ?? []).length,
      order_items: undefined,
    }))
    res.json({ data: orders, total: count ?? 0 })
  } catch (err) { next(err) }
}

export async function getOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    const orderId = (req.params as P).orderId
    const { data, error } = await svc.getCustomerOrder(customer.customer_id, orderId)
    if (error || !data) return res.status(404).json({ error: 'Order not found' })
    res.json(data)
  } catch (err) { next(err) }
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function patchProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    // Whitelist: only name and phone — email changes require separate auth flow
    const { first_name, last_name, phone } = req.body as Record<string, string>
    const { data, error } = await svc.updateCustomerProfile(customer.customer_id, { first_name, last_name, phone })
    if (error) return next(error)
    res.json(data)
  } catch (err) { next(err) }
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    const { data, error } = await svc.listCustomerAddresses(customer.customer_id)
    if (error) return next(error)
    res.json(data ?? [])
  } catch (err) { next(err) }
}

export async function postAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    const { address_name, address_line1, address_line2, city, state, postal_code, country, phone } = req.body
    if (!address_name || !address_line1) {
      return res.status(400).json({ error: 'address_name and address_line1 are required' })
    }

    const { data, error } = await svc.addCustomerAddress(customer.customer_id, {
      address_name, address_line1, address_line2, city, state, postal_code, country, phone,
    })
    if (error) return next(error)
    res.status(201).json(data)
  } catch (err) { next(err) }
}

export async function deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { data: customer, error: custError } = await svc.getCustomerByProfileId(req.user!.id)
    if (custError || !customer) return res.status(404).json({ error: 'Customer not found' })

    const addressId = (req.params as P).addressId
    const { error } = await svc.deleteCustomerAddress(customer.customer_id, addressId)
    if (error) return next(error)
    res.json({ success: true })
  } catch (err) { next(err) }
}
