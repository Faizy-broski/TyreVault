import { createClient } from '@/lib/supabase/server'
import CustomerGroupsClient from '@/components/admin/customers/CustomerGroupsClient'
import type { CustomerGroup } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Customer Groups — Admin' }

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default async function CustomerGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const { search = '', page: pageStr = '1' } = await searchParams
  const page  = Math.max(1, Number(pageStr) || 1)
  const limit = 20

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let groups: CustomerGroup[] = []
  let total = 0

  if (token) {
    const qs = new URLSearchParams({ page: String(page) })
    if (search) qs.set('search', search)
    try {
      const res = await fetch(`${API}/api/admin/customers/groups/list?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        groups = json.groups ?? []
        total  = json.total  ?? 0
      }
    } catch { /* render empty state gracefully */ }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <CustomerGroupsClient
      accessToken={token}
      groups={groups}
      total={total}
      totalPages={totalPages}
      page={page}
      search={search}
    />
  )
}
