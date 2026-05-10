import { createClient } from '@/lib/supabase/server'
import CustomerGroupsClient from '@/components/admin/customers/CustomerGroupsClient'
import type { CustomerGroup } from '@/types/admin.types'

export const metadata = { title: 'Customer Groups' }

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function CustomerGroupsPage({ searchParams }: Props) {
  const params = await searchParams
  const search = params.search ?? ''
  const page   = Number(params.page ?? 1)
  const limit  = 20

  const supabase = await createClient()

  let query = supabase
    .from('customer_groups')
    .select('group_id, group_name, customer_count, created_at, updated_at', { count: 'exact' })
    .order('customer_count', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) query = query.ilike('group_name', `%${search}%`)

  const { data: rawGroups, count } = await query
  const groups     = (rawGroups ?? []) as unknown as CustomerGroup[]
  const totalPages = Math.ceil((count ?? 0) / limit)

  return (
    <CustomerGroupsClient
      groups={groups}
      total={count ?? 0}
      totalPages={totalPages}
      page={page}
      search={search}
    />
  )
}
