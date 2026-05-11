import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CustomerDetailClient from '@/components/admin/customers/CustomerDetailClient'
import type { CustomerListItem, Address, CustomerGroup } from '@/types/admin.types'

export async function generateMetadata({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('customers')
    .select('first_name, last_name, email')
    .eq('customer_id', customerId)
    .single()
  const d = data as unknown as { first_name: string | null; last_name: string | null; email: string } | null
  const name = d ? [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email : 'Customer'
  return { title: name }
}

export type CustomerOrder = {
  order_id:      string
  order_number:  string
  created_at:    string
  payment_status: string
  order_status:  string
  total_amount:  number
  item_count:    number
  order_type:    string | null
  payment_method: string | null
  fitment_id:    string | null
}

export type OrderStats = {
  totalValue:     number
  count:          number
  avgOrderValue:  number
  lastOrderDate:  string | null
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params
  const supabase = await createClient()

  const [customerRes, ordersRes, groupsRes, addressesRes] = await Promise.all([
    supabase
      .from('customers')
      .select('customer_id, email, first_name, last_name, business_name, phone, created_at, profile_id')
      .eq('customer_id', customerId)
      .single(),

    supabase
      .from('orders')
      .select(`
        order_id, order_number, created_at,
        payment_status, order_status, total_amount,
        order_type, payment_method, fitment_id,
        order_items ( order_item_id )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),

    supabase
      .from('customer_group_members')
      .select('customer_groups ( group_id, group_name, customer_count, created_at, updated_at )')
      .eq('customer_id', customerId),

    supabase
      .from('addresses')
      .select('address_id, customer_id, address_name, address_line_1, address_line_2, suburb, postcode, country, state, company, phone')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
  ])

  const customerData = (customerRes as unknown as { data: CustomerListItem | null; error: unknown })
  if (customerRes.error || !customerData.data) notFound()

  const customer  = customerData.data!
  const rawOrders = ((ordersRes as unknown as { data: any[] | null }).data ?? [])
  const orders: CustomerOrder[] = rawOrders.map((o: any) => ({
    order_id:      o.order_id,
    order_number:  o.order_number,
    created_at:    o.created_at,
    payment_status: o.payment_status,
    order_status:  o.order_status,
    total_amount:  Number(o.total_amount ?? 0),
    item_count:    Array.isArray(o.order_items) ? o.order_items.length : 0,
    order_type:    o.order_type ?? null,
    payment_method: o.payment_method  ?? null,
    fitment_id:    o.fitment_id ?? null,
  }))

  const orderStats: OrderStats = {
    totalValue:    orders.reduce((s, o) => s + o.total_amount, 0),
    count:         orders.length,
    avgOrderValue: orders.length > 0
      ? orders.reduce((s, o) => s + o.total_amount, 0) / orders.length
      : 0,
    lastOrderDate: orders.length > 0 ? orders[0].created_at : null,
  }

  const groups    = ((groupsRes as unknown as { data: any[] | null }).data ?? []).map((m: any) => m.customer_groups).filter(Boolean) as CustomerGroup[]
  const addresses = ((addressesRes as unknown as { data: any[] | null }).data ?? []) as unknown as Address[]

  const primaryAddress = addresses[0] ?? null

  return (
    <div className="p-6">
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
        <Link href="/admin/customers" className="hover:text-zinc-900">Customers</Link>
        <span>›</span>
        <span className="text-zinc-900 font-medium">
          {[customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.email}
        </span>
      </div>

      <CustomerDetailClient
        customer={customer}
        orders={orders}
        orderStats={orderStats}
        groups={groups}
        addresses={addresses}
        primaryAddress={primaryAddress}
      />
    </div>
  )
}
