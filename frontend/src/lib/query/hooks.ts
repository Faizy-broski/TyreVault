'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fetchBackendJson } from '@/lib/backend-api'
import { adminKeys } from './keys'
import type { OrderListItem, CustomerListItem, Brand, Supplier, AdminFitmentCentreSummary, Category, Warehouse } from '@/types/admin.types'

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

export function useOrderStats(opts?: { initialData?: OrderStats }) {
  return useQuery({
    queryKey:             adminKeys.orderStats(),
    queryFn:              async () => fetchBackendJson<OrderStats>('/api/admin/orders/stats', await getToken()),
    staleTime:            STATS_STALE,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

export type OrderListParams = {
  search:            string
  page:              number
  paymentStatus:     string
  fulfillmentStatus: string
}

export type OrderListResponse = { data: OrderListItem[]; total: number }

export function useDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const token = await getToken()
      return fetchBackendJson<{ success: boolean }>(
        `/api/admin/orders/${orderId}`,
        token,
        { method: 'DELETE' },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, fulfillmentStatus, paymentStatus }: { orderId: string; fulfillmentStatus?: string; paymentStatus?: string }) => {
      const token = await getToken()
      return fetchBackendJson<{ success: boolean }>(
        `/api/admin/orders/${orderId}/status`,
        token,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fulfillmentStatus, paymentStatus }) },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useOrderList(p: OrderListParams, opts?: { initialData?: OrderListResponse }) {
  const qs = new URLSearchParams({ page: String(p.page) })
  if (p.search)            qs.set('search',            p.search)
  if (p.paymentStatus)     qs.set('paymentStatus',     p.paymentStatus)
  if (p.fulfillmentStatus) qs.set('fulfillmentStatus', p.fulfillmentStatus)

  return useQuery({
    queryKey:             adminKeys.orderList(Object.fromEntries(qs)),
    queryFn:              async () => fetchBackendJson<OrderListResponse>(`/api/admin/orders?${qs}`, await getToken()),
    placeholderData:      keepPreviousData,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

// ─── Customers ───────────────────────────────────────────────────────────────

export type CustomerStats = {
  totalCustomers: number
  totalOrders:    number
  avgOrderSize:   number
  totalRevenue:   number
}

export function useCustomerStats(opts?: { initialData?: CustomerStats }) {
  return useQuery({
    queryKey:             adminKeys.customerStats(),
    queryFn:              async () => fetchBackendJson<CustomerStats>('/api/admin/customers/stats', await getToken()),
    staleTime:            STATS_STALE,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
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

export function useCustomerList(p: CustomerListParams, opts?: { initialData?: CustomerListResponse }) {
  const qs = new URLSearchParams({ page: String(p.page) })
  if (p.search)       qs.set('search',       p.search)
  if (p.accountType)  qs.set('accountType',  p.accountType)
  if (p.customerType) qs.set('customerType', p.customerType)
  if (p.statusFilter) qs.set('status',       p.statusFilter)

  return useQuery({
    queryKey:             adminKeys.customerList(Object.fromEntries(qs)),
    queryFn:              async () => fetchBackendJson<CustomerListResponse>(`/api/admin/customers?${qs}`, await getToken()),
    placeholderData:      keepPreviousData,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
  })
}

// ─── Products ─────────────────────────────────────────────────────────────────

type Brand   = { brand_id: string; brand_name: string }
type Pattern = { pattern_id: string; pattern_name: string; brand_id: string }

export function useProductMeta() {
  return useQuery({
    queryKey: adminKeys.productMeta(),
    queryFn:  async () => fetchBackendJson<{ brands: Brand[]; patterns: Pattern[] }>('/api/admin/products/meta', await getToken()),
    staleTime: META_STALE,
  })
}

export type ProductListParams = {
  search:    string
  page:      number
  sortBy:    string
  sortOrder: string
  brandId:   string
  patternId: string
  status:    string
  stock:     string
}

type ProductRaw = {
  id: string; name: string; image: string | null
  brand:      { brand_id: string; brand_name: string } | null
  collection: { collection_name: string } | null
  variantCount:       number
  activeVariantCount: number
  totalStock:         number
  loadIndexes:        string[]
  isActive:      boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

function normaliseProductRaw(item: ProductRaw): NormalisedProduct {
  return {
    id:             item.id,
    name:           item.name,
    image:          item.image ?? null,
    brand:          item.brand?.brand_name           ?? '—',
    brandId:        item.brand?.brand_id             ?? '',
    collection:     item.collection?.collection_name ?? null,
    variantCount:   item.variantCount,
    activeVariants: item.activeVariantCount,
    totalStock:     item.totalStock  ?? 0,
    loadIndexes:    item.loadIndexes ?? [],
    isActive:       item.isActive,
    showOnWebsite:  item.showOnWebsite,
    updatedAt:      item.updatedAt,
    createdAt:      item.createdAt,
  }
}

export type NormalisedProduct = {
  id: string; name: string; image: string | null; brand: string; brandId: string
  collection: string | null; variantCount: number; activeVariants: number
  totalStock: number
  loadIndexes: string[]
  isActive: boolean; showOnWebsite: boolean; updatedAt: string; createdAt: string
}

export type ProductListResponse = { data: NormalisedProduct[]; total: number }

export function useProductList(p: ProductListParams, opts?: { initialData?: ProductListResponse }) {
  const qs = new URLSearchParams({ page: String(p.page), sortBy: p.sortBy, sortOrder: p.sortOrder })
  if (p.search)    qs.set('search',    p.search)
  if (p.brandId)   qs.set('brandId',   p.brandId)
  if (p.patternId) qs.set('patternId', p.patternId)
  if (p.status)    qs.set('status',    p.status)
  if (p.stock)     qs.set('stock',     p.stock)

  return useQuery({
    queryKey:             adminKeys.productList(Object.fromEntries(qs)),
    queryFn:              async () => {
      const raw = await fetchBackendJson<{ data: ProductRaw[]; total: number }>(
        `/api/admin/products?${qs}`,
        await getToken(),
      )
      return { total: raw.total, data: raw.data.map(normaliseProductRaw) }
    },
    placeholderData:      keepPreviousData,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
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

export function useFitmentCentreList(page = 1, opts?: { initialData?: CentreRow[] }) {
  const qs = new URLSearchParams({ page: String(page) })
  return useQuery({
    queryKey:             adminKeys.centreList(Object.fromEntries(qs)),
    queryFn:              async () => {
      const res = await fetchBackendJson<{ data?: CentreRow[] } | CentreRow[]>(
        `/api/admin/fitment-centres?${qs}`,
        await getToken(),
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    staleTime:            2 * 60_000,
    initialData:          opts?.initialData,
    initialDataUpdatedAt: opts?.initialData ? Date.now() : undefined,
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

// ─── Master-data hooks (brands, patterns, collections, suppliers) ─────────────
// These datasets change only on deliberate admin action — 10 min staleTime means
// navigating away and back never triggers a refetch.

const MASTER_STALE = 10 * 60_000

export type AdminPattern = {
  pattern_id: string; brand_id: string; pattern_name: string; pattern_slug: string
  application_type: string; season_type: string | null; terrain_type: string | null
  is_active: boolean; show_on_website: boolean; main_image: string | null; created_at: string
}

export type AdminCollection = {
  collection_id: string; collection_name: string; collection_slug: string
  description: string | null; is_active: boolean; created_at: string
}

export type PaginatedBrands   = { data: Brand[];         total: number; page: number; limit: number; totalPages: number }
export type PaginatedPatterns = { data: AdminPattern[];   total: number; page: number; limit: number; totalPages: number }

export function useAdminBrands(params: { page?: number; search?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.page   && params.page > 1) qs.set('page',   String(params.page))
  if (params.search)                    qs.set('search', params.search)
  const qStr = qs.toString()
  return useQuery({
    queryKey:        adminKeys.brandList(Object.fromEntries(qs)),
    queryFn:         async () => fetchBackendJson<PaginatedBrands>(`/api/admin/products/brands${qStr ? `?${qStr}` : ''}`, await getToken()),
    staleTime:       MASTER_STALE,
    placeholderData: keepPreviousData,
  })
}

export function useAdminBrandsAll() {
  return useQuery({
    queryKey: adminKeys.brandListAll(),
    queryFn:  async () => fetchBackendJson<Brand[]>('/api/admin/products/brands/all', await getToken()),
    staleTime: MASTER_STALE,
  })
}

export function useAdminPatterns(params: { page?: number; search?: string; brandId?: string; appType?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.page    && params.page > 1) qs.set('page',    String(params.page))
  if (params.search)                     qs.set('search',  params.search)
  if (params.brandId)                    qs.set('brandId', params.brandId)
  if (params.appType)                    qs.set('appType', params.appType)
  const qStr = qs.toString()
  return useQuery({
    queryKey:        adminKeys.patternList(Object.fromEntries(qs)),
    queryFn:         async () => fetchBackendJson<PaginatedPatterns>(`/api/admin/products/patterns${qStr ? `?${qStr}` : ''}`, await getToken()),
    staleTime:       MASTER_STALE,
    placeholderData: keepPreviousData,
  })
}

export function useAdminCollections() {
  return useQuery({
    queryKey: adminKeys.productCollections(),
    queryFn:  async () => fetchBackendJson<AdminCollection[]>('/api/admin/products/collections', await getToken()),
    staleTime: MASTER_STALE,
  })
}

export function useAdminFitmentCentres() {
  return useQuery({
    queryKey: adminKeys.fitmentCentres(),
    queryFn:  async () => {
      const res = await fetchBackendJson<{ data: AdminFitmentCentreSummary[]; total: number }>(
        '/api/admin/fitment-centres?page=1&limit=20', await getToken()
      )
      return res
    },
    staleTime: 5 * 60_000,
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.productCategories(),
    queryFn:  async () => fetchBackendJson<Category[]>('/api/admin/products/categories', await getToken()),
    staleTime: MASTER_STALE,
  })
}

export function useAdminWarehouses(showInactive = false) {
  return useQuery({
    queryKey: adminKeys.warehouseList(showInactive),
    queryFn:  async () => fetchBackendJson<Warehouse[]>(`/api/admin/orders/warehouses?all=${showInactive}`, await getToken()),
    staleTime: MASTER_STALE,
  })
}

export function useAdminSuppliers() {
  return useQuery({
    queryKey: adminKeys.supplierList({}),
    queryFn:  async () => {
      const data = await fetchBackendJson<Supplier[] | { data?: Supplier[] }>('/api/admin/suppliers', await getToken())
      return Array.isArray(data) ? data : (data.data ?? [])
    },
    staleTime: 5 * 60_000,
  })
}
