import { Request, Response } from 'express'
import * as svc from '../services/addresses.service'
import { AddressOwnerType } from '../services/addresses.service'

const VALID_OWNER_TYPES: AddressOwnerType[] = ['customer', 'warehouse', 'supplier', 'fitter']

function isValidOwnerType(v: unknown): v is AddressOwnerType {
  return typeof v === 'string' && VALID_OWNER_TYPES.includes(v as AddressOwnerType)
}

// GET /api/admin/addresses?ownerType=customer&ownerId=<uuid>
export async function listAddresses(req: Request, res: Response) {
  const { ownerType, ownerId } = req.query as Record<string, string>
  if (!isValidOwnerType(ownerType) || !ownerId) {
    return res.status(400).json({ error: 'ownerType (customer|warehouse|supplier|fitter) and ownerId are required' })
  }
  try {
    const addresses = await svc.getAddresses(ownerType, ownerId)
    res.json({ addresses })
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list addresses' })
  }
}

// POST /api/admin/addresses
export async function postAddress(req: Request, res: Response) {
  const {
    ownerType, ownerId,
    addressName, addressLine1, addressLine2,
    suburb, postcode, state, country,
    latitude, longitude, isDefault,
  } = req.body

  if (!isValidOwnerType(ownerType)) {
    return res.status(400).json({ error: 'ownerType must be one of customer|warehouse|supplier|fitter' })
  }
  if (!ownerId)       return res.status(400).json({ error: 'ownerId is required' })
  if (!addressLine1)  return res.status(400).json({ error: 'addressLine1 is required' })

  try {
    const data = await svc.createAddressForOwner(ownerType, ownerId, {
      addressName: addressName ?? 'Address',
      addressLine1, addressLine2,
      suburb, postcode, state, country,
      latitude, longitude, isDefault,
    })
    res.status(201).json({ address: data })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create address' })
  }
}

// PATCH /api/admin/addresses/:addressId/default
export async function setDefault(req: Request, res: Response) {
  const { addressId } = req.params
  const { ownerType, ownerId } = req.body

  if (!isValidOwnerType(ownerType) || !ownerId) {
    return res.status(400).json({ error: 'ownerType and ownerId required in body' })
  }
  try {
    await (svc.setDefaultAddress as Function)(ownerType, ownerId, addressId)
    res.json({ success: true })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to set default' })
  }
}

// DELETE /api/admin/addresses/:addressId
export async function removeAddress(req: Request, res: Response) {
  const { addressId } = req.params
  const { ownerType, ownerId } = req.body

  if (!isValidOwnerType(ownerType) || !ownerId) {
    return res.status(400).json({ error: 'ownerType and ownerId required in body' })
  }
  try {
    await (svc.deleteAddressById as Function)(addressId, ownerType, ownerId)
    res.status(204).send()
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to delete address' })
  }
}
