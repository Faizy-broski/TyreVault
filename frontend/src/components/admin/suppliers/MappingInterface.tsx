'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Upload, CheckCheck } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toastError } from '@/lib/toast'
import MappingRow from './MappingRow'
import MappingParamsPanel from './MappingParamsPanel'
import ManualMapModal from './ManualMapModal'
import type { MappingViewRow, MappingParams } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type FilterTab = 'all' | 'mapped' | 'pending' | 'unmatched'

const DEFAULT_PARAMS: MappingParams = {
  size: 50, brand: 20, pattern: 20, load_speed: 10,
  auto_threshold: 90, review_threshold: 70,
}

interface Props {
  supplierId:     string
  supplierName:   string
  connectionType: string
  accessToken:    string
}

export default function MappingInterface({ supplierId, supplierName, connectionType, accessToken }: Props) {
  const [rows, setRows]             = useState<MappingViewRow[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [filter, setFilter]         = useState<FilterTab>('all')
  const [q, setQ]                   = useState('')
  const [loading, setLoading]       = useState(true)
  const [autoSync, setAutoSync]     = useState(false)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [params, setParams]         = useState<MappingParams>(DEFAULT_PARAMS)
  const [approvingAll, setApprovingAll] = useState(false)
  const [manualMapId, setManualMapId]   = useState<string | null>(null)

  const PAGE_SIZE   = 25
  const totalPages  = Math.ceil(total / PAGE_SIZE)
  const pendingCount = rows.filter(r => r.status === 'pending_review').length

  const headers = {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  // ── Fetch mapping view rows ──────────────────────────────
  const load = useCallback(async (p: number, f: FilterTab, search: string) => {
    setLoading(true)
    try {
      const url = `${API}/api/admin/suppliers/${supplierId}/mapping-view?filter=${f}&page=${p}&q=${encodeURIComponent(search)}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const body = await res.json()
      setRows(body.data ?? [])
      setTotal(body.total ?? 0)
      setPage(p)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load mappings')
    } finally {
      setLoading(false)
    }
  }, [supplierId, accessToken])

  // ── Load settings on mount ───────────────────────────────
  useEffect(() => {
    async function loadSettings() {
      try {
        const [toggleRes, paramsRes] = await Promise.all([
          fetch(`${API}/api/admin/settings/auto_mapping_enabled`,   { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`${API}/api/admin/settings/mapping_parameters`,     { headers: { Authorization: `Bearer ${accessToken}` } }),
        ])
        if (toggleRes.ok) {
          const t = await toggleRes.json()
          setAutoSync(Boolean(t.value))
        }
        if (paramsRes.ok) {
          const p = await paramsRes.json()
          if (p.value) setParams(p.value as MappingParams)
        }
      } catch { /* use defaults */ }
    }
    loadSettings()
  }, [accessToken])

  useEffect(() => { load(1, filter, q) }, []) // initial load

  // ── Debounced search ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => load(1, filter, q), 350)
    return () => clearTimeout(t)
  }, [q])

  function changeFilter(f: FilterTab) {
    setFilter(f)
    load(1, f, q)
  }

  // ── Auto Map + Sync toggle ───────────────────────────────
  async function handleToggle(enabled: boolean) {
    setToggleBusy(true)
    try {
      const res = await fetch(`${API}/api/admin/settings/auto_mapping_enabled`, {
        method: 'PATCH',
        headers,
        body:   JSON.stringify({ value: enabled }),
      })
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`)
      setAutoSync(enabled)
      toast.success(enabled
        ? 'Auto Map + Sync ON — high-confidence matches will map and sync automatically'
        : 'Auto Map + Sync OFF — all matches require your review before stock syncs')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update toggle')
    } finally {
      setToggleBusy(false)
    }
  }

  // ── Row actions ──────────────────────────────────────────
  function removeRow(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
  }

  function updateRow(id: string, patch: Partial<MappingViewRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function approve(mapId: string) {
    try {
      const res = await fetch(`${API}/api/admin/suppliers/mappings/${mapId}/approve`, {
        method: 'PATCH',
        headers,
      })
      if (!res.ok) throw new Error(await res.json().then(b => b.error ?? `Approve failed (${res.status})`).catch(() => `Approve failed (${res.status})`))
      updateRow(mapId, { is_verified: true, status: 'mapped' })
      toast.success('Mapping approved — stock sync queued')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Approve failed')
    }
  }

  async function reject(mapId: string) {
    try {
      const res = await fetch(`${API}/api/admin/suppliers/mappings/${mapId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error(`Reject failed (${res.status})`)
      removeRow(mapId)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Reject failed')
    }
  }

  function onManualMapped(mapId: string) {
    setManualMapId(null)
    updateRow(mapId, { is_verified: true, status: 'mapped' })
    toast.success('Mapping updated — stock sync queued')
  }

  // ── Approve all pending ──────────────────────────────────
  async function approveAll() {
    setApprovingAll(true)
    try {
      const res = await fetch(`${API}/api/admin/suppliers/${supplierId}/mappings/approve-all`, {
        method: 'POST',
        headers,
      })
      if (!res.ok) throw new Error(`Approve all failed (${res.status})`)
      const { count } = await res.json()
      toast.success(`${count} mappings approved — stock sync jobs queued`)
      load(page, filter, q)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Approve all failed')
    } finally {
      setApprovingAll(false)
    }
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All' },
    { key: 'mapped',    label: 'Mapped' },
    { key: 'pending',   label: 'Pending Review' },
    { key: 'unmatched', label: 'Unmatched' },
  ]

  return (
    <div className="space-y-4">
      {/* Top bar: toggle + params + actions */}
      <div className="bg-white rounded-xl border border-zinc-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: supplier info + toggle */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-base font-semibold text-zinc-900">{supplierName}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {connectionType.replace('_', ' ').toUpperCase()} connection
                &nbsp;·&nbsp;
                <Link href={`/admin/suppliers/${supplierId}`} className="hover:underline">
                  Overview
                </Link>
                &nbsp;·&nbsp;
                <Link href={`/admin/suppliers/${supplierId}/review`} className="hover:underline">
                  List Review
                </Link>
              </p>
            </div>

            <div className="flex items-center gap-2.5 border-l border-zinc-200 pl-4">
              <Switch
                checked={autoSync}
                disabled={toggleBusy}
                onCheckedChange={handleToggle}
                id="auto-sync-toggle"
              />
              <label htmlFor="auto-sync-toggle" className="text-sm font-medium text-zinc-700 select-none cursor-pointer">
                Auto Map + Sync
              </label>
              <span className={`text-xs font-semibold ${autoSync ? 'text-green-600' : 'text-amber-600'}`}>
                {autoSync ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={approvingAll}
                onClick={approveAll}
                className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {approvingAll ? 'Approving…' : `Approve All Pending (${pendingCount})`}
              </Button>
            )}
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <Link href={`/admin/suppliers/${supplierId}`}>
                <Upload className="w-3.5 h-3.5" />
                Import CSV
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => load(page, filter, q)}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Off-mode warning */}
        {!autoSync && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            Auto Map + Sync is <strong>OFF</strong> — all matches go to review queue. Stock will not sync until you approve each mapping.
          </div>
        )}
      </div>

      {/* Mapping parameters panel */}
      <MappingParamsPanel
        params={params}
        accessToken={accessToken}
        onSaved={setParams}
      />

      {/* Filter + search bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {filterTabs.map(t => (
            <button
              key={t.key}
              onClick={() => changeFilter(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === t.key
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search size, brand, pattern, SKU…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="w-full sm:w-64 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Split-panel table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
<<<<<<< Updated upstream
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 w-[280px]">OUR INVENTORY</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-zinc-500 w-[160px]">MATCH</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 w-[280px]">SUPPLIER CATALOGUE</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">ACTIONS</th>
=======
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-70">Our Inventory</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">Match</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-70">Supplier Catalogue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
>>>>>>> Stashed changes
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-zinc-100">
                  <td className="px-4 py-4"><div className="h-10 bg-zinc-100 rounded animate-pulse" /></td>
                  <td className="px-3 py-4"><div className="h-10 bg-zinc-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-10 bg-zinc-100 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-8 w-32 bg-zinc-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center">
                  <p className="text-sm font-medium text-zinc-700">No mappings found</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {filter !== 'all'
                      ? 'Try switching to "All" or import a supplier catalogue first.'
                      : 'Import a CSV or connect via API to start mapping products.'}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map(row => (
                <MappingRow
                  key={row.id}
                  row={row}
                  accessToken={accessToken}
                  onApprove={approve}
                  onReject={reject}
                  onManualMap={id => setManualMapId(id)}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Footer: count + pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
          <span className="text-xs text-zinc-400">
            {loading ? 'Loading…' : `Showing ${rows.length} of ${total}`}
          </span>
          {totalPages > 1 && (
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => load(page - 1, filter, q)}
                className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                ← Prev
              </button>
              <span className="px-2.5 py-1 text-xs text-zinc-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages || loading}
                onClick={() => load(page + 1, filter, q)}
                className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual map modal */}
      {manualMapId && (
        <ManualMapModal
          mapId={manualMapId}
          accessToken={accessToken}
          onClose={() => setManualMapId(null)}
          onMapped={() => onManualMapped(manualMapId)}
        />
      )}
    </div>
  )
}
