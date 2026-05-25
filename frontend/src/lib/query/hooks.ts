'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchBackendJson } from '@/lib/backend-api'
import { adminKeys } from './keys'
import type { OrderListItem, CustomerListItem } from '@/types/admin.types'

// Supabase caches the session in memory — calling this is essentially free after first auth.
async function getToken(): Promise<string> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

const STATS_STALE = 60_000      // 1 min — aggregates change on every order/customer
const META_STALE  = 5 * 60_000  // 5 min — brands, categories, collections rarely change

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStats = {
  totalOrders:    number
  totalRevenue:   number
  avgOrderSize:   number
  pendingPayment: number
}

export function useOrderStats() {
  return useQuery({
    queryKey: adminKeys.orderStats(),
    queryFn:  async () => fetchBackendJson<OrderStats>('/api/admin/orders/stats', await getToken()),
    staleTime: STATS_STALE,
  })
}

export type OrderListParams = {
  search:            string
  page:              number
  paymentStatus:     string
  fulfillmentStatus: string
}

export type OrderListResponse = { data: OrderListItem[]; total: number }

export function useOrderList(p: OrderListParams) {
  const qs = new URLSearchParams({ page: String(p.page) })
  if (p.search)            qs.set('search',            p.search)
  if (p.paymentStatus)     qs.set('paymentStatus',     p.paymentStatus)
  if (p.fulfillmentStatus) qs.set('fulfillmentStatus', p.fulfillmentStatus)

  return useQuery({
    queryKey:        adminKeys.orderList(Object.fromEntries(qs)),
    queryFn:         async () => fetchBackendJson<OrderListResponse>(`/api/admin/orders?${qs}`, await getToken()),
    placeholderData: keepPreviousData, // prevents blank flash when changing page/filters
  })
}

// ─── Customers ───────────────────────────────────────────────────────────────

export type CustomerStats = {
  totalCustomers: number
  totalOrders:    number
  avgOrderSize:   number
  totalRevenue:   number
}

export function useCustomerStats() {
  return useQuery({
    queryKey: adminKeys.customerStats(),
    queryFn:  async () => fetchBackendJson<CustomerStats>('/api/admin/customers/stats', await getToken()),
    staleTime: STATS_STALE,
  })
}

export type CustomerListParams = {
  search:        string
  page:          number
  accountType?:  'guest' | 'registered'
  customerType:  string
  statusFilter:  string
}

export type CustomerListResponse = { customers: CustomerListItem[]; total: number }

export function useCustomerList(p: CustomerListParams) {
  const qs = new URLSearchParams({ page: String(p.page) })
  if (p.search)       qs.set('search',       p.search)
  if (p.accountType)  qs.set('accountType',  p.accountType)
  if (p.customerType) qs.set('customerType', p.customerType)
  if (p.statusFilter) qs.set('status',       p.statusFilter)

  return useQuery({
    queryKey:        adminKeys.customerList(Object.fromEntries(qs)),
    queryFn:         async () => fetchBackendJson<CustomerListResponse>(`/api/admin/customers?${qs}`, await getToken()),
    placeholderData: keepPreviousData,
  })
}

// ─── Products ─────────────────────────────────────────────────────────────────

type Brand = { brand_id: string; brand_name: string }

export function useProductMeta() {
  return useQuery({
    queryKey: adminKeys.productMeta(),
    queryFn:  async () => fetchBackendJson<{ brands: Brand[] }>('/api/admin/products/meta', await getToken()),
    staleTime: META_STALE,
  })
}

export type ProductListParams = {
  search:    string
  page:      number
  sortBy:    string
  sortOrder: string
  brandId:   string
  status:    string
}

type ProductRaw = {
  id: string; name: string
  brand:      { brand_id: string; brand_name: string } | null
  collection: { collection_name: string } | null
  variantCount:       number
  activeVariantCount: number
  isActive:      boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

export type NormalisedProduct = {
  id: string; name: string; brand: string; brandId: string
  collection: string | null; variantCount: number; activeVariants: number
  isActive: boolean; showOnWebsite: boolean; updatedAt: string; createdAt: string
}

export type ProductListResponse = { data: NormalisedProduct[]; total: number }

export function useProductList(p: ProductListParams) {
  const qs = new URLSearchParams({ page: String(p.page), sortBy: p.sortBy, sortOrder: p.sortOrder })
  if (p.search)  qs.set('search',  p.search)
  if (p.brandId) qs.set('brandId', p.brandId)
  if (p.status)  qs.set('status',  p.status)

  return useQuery({
    queryKey: adminKeys.productList(Object.fromEntries(qs)),
    queryFn:  async () => {
      const raw = await fetchBackendJson<{ data: ProductRaw[]; total: number }>(
        `/api/admin/products?${qs}`,
        await getToken(),
      )
      return {
        total: raw.total,
        data:  raw.data.map((item): NormalisedProduct => ({
          id:             item.id,
          name:           item.name,
          brand:          item.brand?.brand_name          ?? '—',
          brandId:        item.brand?.brand_id            ?? '',
          collection:     item.collection?.collection_name ?? null,
          variantCount:   item.variantCount,
          activeVariants: item.activeVariantCount,
          isActive:       item.isActive,
          showOnWebsite:  item.showOnWebsite,
          updatedAt:      item.updatedAt,
          createdAt:      item.createdAt,
        })),
      }
    },
    placeholderData: keepPreviousData,
  })
}

// ─── Fitment Centres ─────────────────────────────────────────────────────────

export type CentreRow = {
  fitment_id:    string
  business_name: string
  partner_id:    string
  is_active:     boolean
  profiles?:     { email?: string } | null
}

export function useFitmentCentreList(page = 1) {
  const qs = new URLSearchParams({ page: String(page) })
  return useQuery({
    queryKey: adminKeys.centreList(Object.fromEntries(qs)),
    queryFn:  async () => {
      const res = await fetchBackendJson<{ data?: CentreRow[] } | CentreRow[]>(
        `/api/admin/fitment-centres?${qs}`,
        await getToken(),
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    staleTime: 2 * 60_000,
  })
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export interface PromotionRow {
  promotion_id:      string
  title:             string
  brand_name:        string | null
  description:       string | null
  image_url:         string | null
  cta_url:           string | null
  discount_type:     'percent' | 'fixed_amount' | 'bundle'
  discount_value:    number
  start_date:        string
  end_date:          string
  applies_to:        string
  target_id:         string | null
  minimum_qty:       number
  is_active:         boolean
  show_on_homepage:  boolean
  display_order:     number
  created_at:        string
  updated_at:        string
}

export function usePromotionList(params: { page?: number; search?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.page)   qs.set('page',   String(params.page))
  if (params.search) qs.set('search', params.search)
  return useQuery({
    queryKey:    adminKeys.promotionList(Object.fromEntries(qs)),
    queryFn:     async () => fetchBackendJson<{ data: PromotionRow[]; total: number }>(
      `/api/admin/promotions?${qs}`,
      await getToken(),
    ),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function usePromotionDetail(id: string) {
  return useQuery({
    queryKey: adminKeys.promotionDetail(id),
    queryFn:  async () => fetchBackendJson<PromotionRow>(
      `/api/admin/promotions/${id}`,
      await getToken(),
    ),
    enabled: !!id,
    staleTime: 30_000,
  })
}
