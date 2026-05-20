'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CustomerGroupsClient from '@/components/admin/customers/CustomerGroupsClient'
import type { CustomerGroup } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function CustomerGroupsPage() {
  const searchParams = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const page   = Number(searchParams.get('page') ?? 1)
  const limit  = 20

  const [groups, setGroups]   = useState<CustomerGroup[]>([])
  const [total, setTotal]     = useState(0)
  const [token, setToken]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Customer Groups | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        if (!cancelled) setToken(tok)

        const qs = new URLSearchParams({ page: String(page) })
        if (search) qs.set('search', search)

        const res = await fetch(`${API}/api/admin/customers/groups/list?${qs}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setGroups(json.groups ?? [])
          setTotal(json.total ?? 0)
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load groups')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, page])

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
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
