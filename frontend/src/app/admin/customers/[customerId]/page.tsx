'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useCustomerDetail } from '@/lib/query/hooks'
import { adminKeys } from '@/lib/query/keys'
import CustomerDetailClient from '@/components/admin/customers/CustomerDetailClient'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastError } from '@/lib/toast'
import type {
  Address,
  CustomerGroup,
  CustomerListItem,
} from '@/types/admin.types'

export type CustomerOrder = {
  order_id: string
  order_number: string
  created_at: string
  payment_status: string
  order_status: string
  total_amount: number
  item_count: number
  order_type: string | null
  payment_method?: string | null
  fitment_id?: string | null
}

export type OrderStats = {
  totalValue: number
  count: number
  avgOrderValue: number
  lastOrderDate: string | null
}

type PageState = {
  customer: CustomerListItem
  orders: CustomerOrder[]
  orderStats: OrderStats
  groups: CustomerGroup[]
  addresses: Address[]
  primaryAddress: Address | null
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const queryClient = useQueryClient()

  const [token, setToken] = useState('')
  const { data, isPending: loading, isError, error } = useCustomerDetail(customerId)

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) =>
      setToken(session?.access_token ?? ''),
    )
  }, [])

  useEffect(() => {
    if (isError) toastError(error instanceof Error ? error.message : 'Failed to load customer')
  }, [isError, error])

  const state = useMemo<PageState | null>(() => {
    const detail = data?.customer
    if (!detail) return null

    const customer: CustomerListItem = {
      customer_id:        detail.customer_id,
      email:              detail.email,
      first_name:         detail.first_name,
      last_name:          detail.last_name,
      business_name:      detail.business_name,
      phone:              detail.phone,
      created_at:         detail.created_at,
      profile_id:         detail.profile_id,
      customer_type:      detail.customer_type     ?? null,
      account_status:     detail.account_status    ?? null,
      credit_limit:       detail.credit_limit      ?? null,
      payment_terms:      detail.payment_terms     ?? null,
      billing_address_id: detail.billing_address_id ?? null,
      customer_group_id:  (detail as any).customer_group_id ?? null,
    }

    const orders: CustomerOrder[] = detail.orders.map(order => ({
      order_id: order.order_id,
      order_number: order.order_number,
      created_at: order.created_at,
      payment_status: order.payment_status,
      order_status: order.order_status,
      total_amount: Number(order.total_amount ?? 0),
      item_count: order.item_count ?? 0,
      order_type: order.order_type ?? null,
    }))

    const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0)
    const orderStats: OrderStats = {
      totalValue,
      count: orders.length,
      avgOrderValue: orders.length > 0 ? totalValue / orders.length : 0,
      lastOrderDate: orders[0]?.created_at ?? null,
    }

    const addresses = detail.addresses as Address[]

    return {
      customer,
      orders,
      orderStats,
      groups: detail.groups as CustomerGroup[],
      addresses,
      primaryAddress: addresses[0] ?? null,
    }
  }, [data])

  useEffect(() => {
    const c = state?.customer
    const name = c ? ([c.first_name, c.last_name].filter(Boolean).join(' ') || c.email) : null
    document.title = name ? `${name} | Tyre Vault` : 'Customer | Tyre Vault'
  }, [state])

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="p-4 sm:p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Customers', href: '/admin/customers' }, { label: 'Customer' }]} />
        <p className="mt-6 text-sm text-zinc-500">Customer not found.</p>
      </div>
    )
  }

  const customerName =
    [state.customer.first_name, state.customer.last_name].filter(Boolean).join(' ') ||
    state.customer.email

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Customers', href: '/admin/customers' },
          { label: customerName },
        ]} />
      </div>
      <CustomerDetailClient
        accessToken={token}
        customer={state.customer}
        orders={state.orders}
        orderStats={state.orderStats}
        groups={state.groups}
        addresses={state.addresses}
        primaryAddress={state.primaryAddress}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: adminKeys.customerDetail(customerId) })}
      />
    </div>
  )
}
