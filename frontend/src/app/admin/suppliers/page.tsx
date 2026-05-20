'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SuppliersClient from '@/components/admin/suppliers/SuppliersClient'
import type { Supplier } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [token, setToken]         = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => { document.title = 'Suppliers | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        if (!cancelled) setToken(tok)

        const res = await fetch(`${API}/api/admin/suppliers`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const data = await res.json()
        if (!cancelled) setSuppliers(Array.isArray(data) ? data : data.data ?? [])
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load suppliers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return <SuppliersClient initialSuppliers={suppliers} accessToken={token} />
}
