'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchBackendJson, BACKEND_API_URL } from '@/lib/backend-api'
import { customerKeys } from './keys'

async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  customer_id: string
  email:       string
  first_name:  string | null
  last_name:   string | null
  phone:       string | null
  created_at:  string
}

export interface CustomerOrderSummary {
  order_id:      string
  order_number:  string
  created_at:    string
  total_amount:  number
  payment_status: string
  order_status:  string
  order_type:    string
  delivery_method: string
  item_count:    number
}

export interface CustomerOrderDetail {
  order_id:                   string
  order_number:               string
  created_at:                 string
  currency:                   string
  notes:                      string | null
  shipping_cost:              number | null
  fitting_cost:               number | null
  gst_amount:                 number | null
  discount_amount:            number | null
  total_amount:               number
  payment_status:             string
  order_status:               string
  order_type:                 string
  delivery_method:            string
  fitment_centre_id:          string | null
  shipping_address_snapshot:  Record<string, string> | null
  order_items:                OrderItem[]
  order_payments:             OrderPayment[]
  order_shipments:            OrderShipment[]
  order_activity:             OrderActivity[]
}

export interface OrderItem {
  order_item_id: string
  product_id:    string
  product_type:  string
  quantity:      number
  unit_price:    number
  skus:          { sku: string; tyre_size_display: string } | null
}

export interface OrderPayment {
  payment_id:     string
  payment_method: string
  amount:         number
  currency:       string
  status:         string
  created_at:     string
}

export interface OrderShipment {
  shipment_id:     string
  shipment_number: string
  status:          string
  tracking_number: string | null
  tracking_uri:    string | null
  shipping_method: string | null
  created_at:      string
  shipped_at:      string | null
  delivered_at:    string | null
}

export interface OrderActivity {
  activity_id: string
  event_type:  string
  description: string | null
  created_at:  string
}

export interface CustomerAddress {
  address_id:    string
  address_name:  string
  address_line1: string
  address_line2: string | null
  city:          string | null
  state:         string | null
  postal_code:   string | null
  country:       string | null
  phone:         string | null
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCustomerMe() {
  return useQuery({
    queryKey: customerKeys.me(),
    queryFn:  async () => fetchBackendJson<CustomerProfile>('/api/customer/me', await getToken()),
    staleTime: 5 * 60_000,
  })
}

export function useCustomerOrders(page = 1) {
  return useQuery({
    queryKey: customerKeys.orderList({ page: String(page) }),
    queryFn:  async () => fetchBackendJson<{ data: CustomerOrderSummary[]; total: number }>(
      `/api/customer/orders?page=${page}`,
      await getToken(),
    ),
    staleTime: 30_000,
  })
}

export function useCustomerOrderDetail(orderId: string) {
  return useQuery({
    queryKey: customerKeys.orderDetail(orderId),
    queryFn:  async () => fetchBackendJson<CustomerOrderDetail>(
      `/api/customer/orders/${orderId}`,
      await getToken(),
    ),
    staleTime: 60_000,
    enabled:   !!orderId,
  })
}

export function useCustomerAddresses() {
  return useQuery({
    queryKey: customerKeys.addresses(),
    queryFn:  async () => fetchBackendJson<CustomerAddress[]>('/api/customer/addresses', await getToken()),
    staleTime: 5 * 60_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateCustomerProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: { first_name?: string; last_name?: string; phone?: string }) => {
      const token = await getToken()
      return fetchBackendJson<CustomerProfile>('/api/customer/profile', token, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.me() }),
  })
}

export function useAddAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<CustomerAddress, 'address_id'>) => {
      const token = await getToken()
      return fetchBackendJson<CustomerAddress>('/api/customer/addresses', token, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.addresses() }),
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (addressId: string) => {
      const token = await getToken()
      return fetchBackendJson<{ success: boolean }>(
        `/api/customer/addresses/${addressId}`,
        token,
        { method: 'DELETE' },
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.addresses() }),
  })
}

// ── Guest order tracking (no auth) ───────────────────────────────────────────

export interface GuestOrderResult {
  order_id:                   string
  order_number:               string
  order_status:               string
  payment_status:             string
  order_type:                 string
  delivery_method:            string
  total_amount:               number
  created_at:                 string
  shipping_address_snapshot:  Record<string, string> | null
  items:                      GuestOrderItem[]
  shipments:                  GuestOrderShipment[]
  activity:                   GuestOrderActivity[]
}

export interface GuestOrderItem {
  order_item_id: string
  quantity:      number
  unit_price:    number
  total_price:   number
  sku:           string | null
  tyre_size:     string | null
  product_type:  string
}

export interface GuestOrderShipment {
  shipment_id:     string
  shipment_number: string
  status:          string
  tracking_number: string | null
  tracking_uri:    string | null
  shipped_at:      string | null
  delivered_at:    string | null
}

export interface GuestOrderActivity {
  event_type:  string
  description: string | null
  created_at:  string
}

export async function fetchGuestOrder(orderNumber: string, email: string): Promise<GuestOrderResult | null> {
  const res = await fetch(`${BACKEND_API_URL}/api/track`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ order_number: orderNumber, email }),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error ?? `Request failed (${res.status})`)
  }
  return res.json()
}
