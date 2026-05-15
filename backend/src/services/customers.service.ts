import { supabase as supabaseAdmin } from './supabase.service'

const PAGE_SIZE = 20

// ── Customers ──────────────────────────────────────────────────────────────

export async function getCustomerStats() {
  const [custRes, orderRes] = await Promise.all([
    supabaseAdmin
      .from('customers')
      .select('profile_id', { count: 'exact' }),
    supabaseAdmin
      .from('orders')
      .select('total_amount, order_id', { count: 'exact' }),
  ])

  const totalCustomers = custRes.count  ?? 0
  const totalOrders    = orderRes.count ?? 0
  const totalRevenue   = (orderRes.data ?? []).reduce((s, o: any) => s + (Number(o.total_amount) ?? 0), 0)
  const avgOrderSize   = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return { totalCustomers, totalOrders, avgOrderSize, totalRevenue }
}

export async function listCustomers(opts: {
  search?: string
  accountType?: 'guest' | 'registered'
  page?: number
}) {
  const { search = '', accountType, page = 1 } = opts
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('customers')
    .select('customer_id, email, first_name, last_name, business_name, phone, created_at, profile_id', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search)       query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  if (accountType === 'guest')      query = query.is('profile_id', null)
  if (accountType === 'registered') query = query.not('profile_id', 'is', null)

  const { data, error, count } = await query

  if (error || !data?.length) {
    return { data: data ?? [], error, count }
  }

  const customerIds = data.map(customer => customer.customer_id)
  const { data: orderRows, error: ordersError } = await supabaseAdmin
    .from('orders')
    .select('customer_id, total_amount, order_number, created_at')
    .in('customer_id', customerIds)
    .order('created_at', { ascending: false })

  if (ordersError || !orderRows?.length) {
    return { data, error: ordersError, count }
  }

  const orderSummaryByCustomer = new Map<string, {
    order_count: number
    total_spent: number
    last_order_number: string | null
    last_order_date: string | null
  }>()

  for (const row of orderRows) {
    const customerId = row.customer_id as string
    const existing = orderSummaryByCustomer.get(customerId) ?? {
      order_count: 0,
      total_spent: 0,
      last_order_number: null,
      last_order_date: null,
    }

    existing.order_count += 1
    existing.total_spent += Number(row.total_amount ?? 0)

    if (!existing.last_order_number) {
      existing.last_order_number = row.order_number ?? null
      existing.last_order_date = row.created_at ?? null
    }

    orderSummaryByCustomer.set(customerId, existing)
  }

  const enriched = data.map(customer => ({
    ...customer,
    ...(orderSummaryByCustomer.get(customer.customer_id) ?? {
      order_count: 0,
      total_spent: 0,
      last_order_number: null,
      last_order_date: null,
    }),
  }))

  return { data: enriched, error: null, count }
}

export async function getCustomer(customerId: string) {
  const supabase = supabaseAdmin

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
        order_type,
        order_items ( product_id )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE),

    supabase
      .from('customer_group_members')
      .select('customer_groups ( group_id, group_name, customer_count, created_at, updated_at )')
      .eq('customer_id', customerId),

    supabase
      .from('addresses')
      .select('address_id, address_name, address_line_1, address_line_2, suburb, postcode, country, state, company, phone')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
  ])

  if (customerRes.error || !customerRes.data) return { data: null, error: customerRes.error }

  const orders = (ordersRes.data ?? []).map((o: any) => ({
    ...o,
    item_count: Array.isArray(o.order_items) ? o.order_items.length : 0,
  }))

  const groups = (groupsRes.data ?? [])
    .map((m: any) => m.customer_groups)
    .filter(Boolean)

  return {
    data: {
      ...customerRes.data,
      orders,
      groups,
      addresses: addressesRes.data ?? [],
    },
    error: null,
  }
}

export async function createCustomer(payload: {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
}) {
  return supabaseAdmin.from('customers').insert({
    email:         payload.email,
    first_name:    payload.firstName ?? null,
    last_name:     payload.lastName  ?? null,
    business_name: payload.company   ?? null,
    phone:         payload.phone     ?? null,
    profile_id: null,
  }).select('customer_id').single()
}

export async function updateCustomer(customerId: string, patch: {
  email?: string
  firstName?: string
  lastName?: string
  company?: string
  phone?: string
}) {
  return supabaseAdmin.from('customers').update({
    ...(patch.email     !== undefined && { email:         patch.email }),
    ...(patch.firstName !== undefined && { first_name:    patch.firstName }),
    ...(patch.lastName  !== undefined && { last_name:     patch.lastName }),
    ...(patch.company   !== undefined && { business_name: patch.company }),
    ...(patch.phone     !== undefined && { phone:         patch.phone }),
  }).eq('customer_id', customerId)
}

export async function deleteCustomer(customerId: string) {
  return supabaseAdmin.from('customers').delete().eq('customer_id', customerId)
}

// ── Addresses ──────────────────────────────────────────────────────────────

export async function createAddress(customerId: string, payload: {
  addressName: string
  addressLine1: string
  addressLine2?: string
  city?: string
  postalCode?: string
  country?: string
  state?: string
  company?: string
  phone?: string
}) {
  return supabaseAdmin.from('addresses').insert({
    customer_id:    customerId,
    owner_type:     'customer',
    owner_id:       customerId,
    address_name:   payload.addressName,
    // original NOT NULL column + spec-compliance alias both required
    address_line1:  payload.addressLine1,
    address_line_1: payload.addressLine1,
    address_line2:  payload.addressLine2 ?? null,
    address_line_2: payload.addressLine2 ?? null,
    city:           payload.city         ?? null,
    suburb:         payload.city         ?? null,
    postal_code:    payload.postalCode   ?? null,
    postcode:       payload.postalCode   ?? null,
    country:        payload.country      ?? null,
    state:          payload.state        ?? null,
    company:        payload.company      ?? null,
    phone:          payload.phone        ?? null,
  }).select('address_id').single()
}

export async function deleteAddress(customerId: string, addressId: string) {
  return supabaseAdmin.from('addresses').delete()
    .eq('address_id', addressId)
    .eq('customer_id', customerId)
}

// ── Group membership ────────────────────────────────────────────────────────

export async function addCustomerToGroup(customerId: string, groupId: string) {
  return supabaseAdmin.from('customer_group_members').upsert(
    { customer_id: customerId, group_id: groupId },
    { onConflict: 'customer_id,group_id', ignoreDuplicates: true }
  )
}

export async function removeCustomerFromGroup(customerId: string, groupId: string) {
  return supabaseAdmin.from('customer_group_members').delete()
    .eq('customer_id', customerId)
    .eq('group_id', groupId)
}

// ── Customer Groups ─────────────────────────────────────────────────────────

export async function listCustomerGroups(opts: { search?: string; page?: number }) {
  const { search = '', page = 1 } = opts
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('customer_groups')
    .select('group_id, group_name, customer_count, created_at, updated_at', { count: 'exact' })
    .order('customer_count', { ascending: false })
    .range(from, to)

  if (search) query = query.ilike('group_name', `%${search}%`)

  const { data, error, count } = await query
  return { data, error, count }
}

export async function getCustomerGroup(groupId: string) {
  const [groupRes, membersRes] = await Promise.all([
    supabaseAdmin
      .from('customer_groups')
      .select('group_id, group_name, customer_count, created_at, updated_at')
      .eq('group_id', groupId)
      .single(),

    supabaseAdmin
      .from('customer_group_members')
      .select(`
        customers (
          customer_id, email, first_name, last_name, business_name, phone, created_at, profile_id
        )
      `)
      .eq('group_id', groupId)
      .order('added_at', { ascending: false })
      .limit(PAGE_SIZE),
  ])

  if (groupRes.error || !groupRes.data) return { data: null, error: groupRes.error }

  const members = (membersRes.data ?? [])
    .map((m: any) => m.customers)
    .filter(Boolean)

  return { data: { ...groupRes.data, members }, error: null }
}

export async function createCustomerGroup(name: string) {
  return supabaseAdmin.from('customer_groups').insert({ group_name: name }).select('group_id').single()
}

export async function updateCustomerGroup(groupId: string, name: string) {
  return supabaseAdmin.from('customer_groups').update({ group_name: name }).eq('group_id', groupId)
}

export async function deleteCustomerGroup(groupId: string) {
  return supabaseAdmin.from('customer_groups').delete().eq('group_id', groupId)
}

export async function addMemberToGroup(groupId: string, customerId: string) {
  return supabaseAdmin.from('customer_group_members').upsert(
    { customer_id: customerId, group_id: groupId },
    { onConflict: 'customer_id,group_id', ignoreDuplicates: true }
  )
}

export async function removeMemberFromGroup(groupId: string, customerId: string) {
  return supabaseAdmin.from('customer_group_members').delete()
    .eq('group_id', groupId)
    .eq('customer_id', customerId)
}
