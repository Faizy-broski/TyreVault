import type { Request, Response } from 'express'
import * as svc from '../services/customers.service'

type P = Record<string, string>

// ── Customers ───────────────────────────────────────────────────────────────

export async function getCustomerStats(_req: Request, res: Response) {
  try {
    const stats = await svc.getCustomerStats()
    res.json(stats)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

export async function getCustomers(req: Request, res: Response) {
  const search       = String(req.query.search ?? '')
  const accountType  = req.query.accountType as 'guest' | 'registered' | undefined
  const customerType = req.query.customerType ? String(req.query.customerType) : undefined
  const status       = req.query.status       ? String(req.query.status)       : undefined
  const page         = req.query.page ? Number(req.query.page) : 1

  const { data, error, count } = await svc.listCustomers({ search, accountType, customerType, status, page })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ customers: data, total: count })
}

export async function getCustomer(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { data, error } = await svc.getCustomer(id)
  if (error)  return res.status(500).json({ error: (error as any).message })
  if (!data)  return res.status(404).json({ error: 'Customer not found' })
  res.json({ customer: data })
}

export async function postCustomer(req: Request, res: Response) {
  const { email, firstName, lastName, company, phone, customerType, accountStatus } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })
  const { data, error } = await svc.createCustomer({ email, firstName, lastName, company, phone, customerType, accountStatus })
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ customer: data })
}

export async function patchCustomer(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { error } = await svc.updateCustomer(id, req.body)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
}

export async function removeCustomer(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { error } = await svc.deleteCustomer(id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
}

// ── Addresses ───────────────────────────────────────────────────────────────

export async function postAddress(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { addressName, addressLine1, addressLine2, city, postalCode, country, state, company, phone } = req.body
  if (!addressName || !addressLine1) return res.status(400).json({ error: 'addressName and addressLine1 required' })
  const { data, error } = await svc.createAddress(id, { addressName, addressLine1, addressLine2, city, postalCode, country, state, company, phone })
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ address: data })
}

export async function removeAddress(req: Request, res: Response) {
  const p = req.params as P
  const { error } = await svc.deleteAddress(String(p.id), String(p.addressId))
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
}

// ── Customer ↔ Group membership ──────────────────────────────────────────────

export async function putCustomerGroup(req: Request, res: Response) {
  const p = req.params as P
  const { error } = await svc.addCustomerToGroup(String(p.id), String(p.groupId))
  if (error) return res.status(400).json({ error: (error as any).message })
  res.json({ success: true })
}

export async function deleteCustomerGroup(req: Request, res: Response) {
  const p = req.params as P
  const { error } = await svc.removeCustomerFromGroup(String(p.id), String(p.groupId))
  if (error) return res.status(400).json({ error: (error as any).message })
  res.json({ success: true })
}

// ── Customer Groups ─────────────────────────────────────────────────────────

export async function getGroups(req: Request, res: Response) {
  const search = String(req.query.search ?? '')
  const page   = req.query.page ? Number(req.query.page) : 1
  const { data, error, count } = await svc.listCustomerGroups({ search, page })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ groups: data, total: count })
}

export async function getGroup(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { data, error } = await svc.getCustomerGroup(id)
  if (error)  return res.status(500).json({ error: (error as any).message })
  if (!data)  return res.status(404).json({ error: 'Group not found' })
  res.json({ group: data })
}

export async function postGroup(req: Request, res: Response) {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { data, error } = await svc.createCustomerGroup(name)
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json({ group: data })
}

export async function patchGroup(req: Request, res: Response) {
  const id   = String((req.params as P).id)
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  const { error } = await svc.updateCustomerGroup(id, name)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
}

export async function removeGroup(req: Request, res: Response) {
  const id = String((req.params as P).id)
  const { error } = await svc.deleteCustomerGroup(id)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
}

export async function putGroupMember(req: Request, res: Response) {
  const p = req.params as P
  const { error } = await svc.addMemberToGroup(String(p.id), String(p.customerId))
  if (error) return res.status(400).json({ error: (error as any).message })
  res.json({ success: true })
}

export async function deleteGroupMember(req: Request, res: Response) {
  const p = req.params as P
  const { error } = await svc.removeMemberFromGroup(String(p.id), String(p.customerId))
  if (error) return res.status(400).json({ error: (error as any).message })
  res.json({ success: true })
}
