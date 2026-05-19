'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FitmentCentresClient from '@/components/admin/fitment-centres/FitmentCentresClient'
import type { AdminFitmentCentreSummary } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function AdminFittersCentrePage() {
  const [centres, setCentres] = useState<AdminFitmentCentreSummary[]>([])
  const [total, setTotal]     = useState(0)
  const [token, setToken]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Fitment Centres | Tyre Vault' }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        if (!cancelled) setToken(tok)

        const res = await fetch(`${API}/api/admin/fitment-centres?page=1`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) {
          setCentres(json.data ?? [])
          setTotal(json.total ?? 0)
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load centres')
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

  return (
    <FitmentCentresClient
      initialCentres={centres}
      initialTotal={total}
      accessToken={token}
    />
  )
}
