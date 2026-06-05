'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import type { Supplier } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type ConnectionType = 'api_link' | 'edi' | 'csv' | 'manual'

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  api_link: 'API Link',
  edi:      'EDI',
  csv:      'Manual CSV',
  manual:   'Manual CSV',
}

interface SupplierMapRow {
  id:              string
  supplier_id:     string
  supplier_name:   string | null
  connection_type: string
  supplier_sku:    string | null
  supplier_price:  number | null
  supplier_stock:  number | null
  synced_price:    number | null
  synced_qty:      number | null
}

interface DraftRow {
  key:             string
  supplier_id:     string
  supplier_name:   string
  connection_type: ConnectionType
  supplier_sku:    string
}

interface Props {
  variantId:    string
  patternId:    string
  ourSkuMatch:  string   // displayed read-only in "Our SKU Match" column
}

// Read-only pink field
function SyncField({ value }: { value: string }) {
  return (
    <input
      readOnly
      value={value}
      className="w-full rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-zinc-600 tabular-nums"
    />
  )
}

// Supplier autocomplete input
function SupplierSearch({
  value,
  onChange,
  onSelect,
  accessToken,
}: {
  value:       string
  onChange:    (v: string) => void
  onSelect:    (s: Supplier) => void
  accessToken: string
}) {
  const [results, setResults] = useState<Supplier[]>([])
  const [open, setOpen]       = useState(false)
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef               = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    try {
      const res = await fetch(`${API}/api/admin/suppliers?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
      }
    } catch { /* ignore */ }
  }, [accessToken])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder="e.g. Tyres R Us"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-zinc-200 shadow-lg max-h-40 overflow-y-auto">
          {results.map(s => (
            <button
              key={s.supplier_id}
              type="button"
              onMouseDown={() => {
                onSelect(s)
                setOpen(false)
                setResults([])
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-50 text-sm"
            >
              <span className="text-zinc-900">{s.supplier_name}</span>
              <span className="text-xs text-zinc-400 ml-2 shrink-0">
                {CONNECTION_LABELS[(s.connection_type as ConnectionType)] ?? s.connection_type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SupplierMappingSection({ variantId, patternId, ourSkuMatch }: Props) {
  const [rows, setRows]         = useState<SupplierMapRow[]>([])
  const [drafts, setDrafts]     = useState<DraftRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null) // key of draft being saved
  const [removing, setRemoving] = useState<string | null>(null) // id of row being removed
  const [token, setToken]       = useState('')

  // Get auth token once
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
    })
  }, [])

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchMappings = useCallback(async (tok: string) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/admin/products/${patternId}/variants/${variantId}/supplier-mappings`,
        { headers: { Authorization: `Bearer ${tok}` } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRows(await res.json())
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to load supplier mappings')
    } finally {
      setLoading(false)
    }
  }, [patternId, variantId])

  useEffect(() => {
    if (token) fetchMappings(token)
  }, [token, fetchMappings])

  function addDraft() {
    setDrafts(prev => [...prev, {
      key:             crypto.randomUUID(),
      supplier_id:     '',
      supplier_name:   '',
      connection_type: 'manual',
      supplier_sku:    '',
    }])
  }

  function updateDraft(key: string, patch: Partial<DraftRow>) {
    setDrafts(prev => prev.map(d => d.key === key ? { ...d, ...patch } : d))
  }

  function removeDraft(key: string) {
    setDrafts(prev => prev.filter(d => d.key !== key))
  }

  async function saveDraft(draft: DraftRow) {
    if (!draft.supplier_id) { toastError('Select a supplier first'); return }
    if (!draft.supplier_sku.trim()) { toastError('Supplier SKU is required'); return }
    setSaving(draft.key)
    try {
      const res = await fetch(
        `${API}/api/admin/products/${patternId}/variants/${variantId}/supplier-mappings`,
        {
          method:  'POST',
          headers,
          body:    JSON.stringify({ supplier_id: draft.supplier_id, supplier_sku: draft.supplier_sku }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      toast.success('Supplier mapping saved — stock sync queued')
      removeDraft(draft.key)
      fetchMappings(token)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save mapping')
    } finally {
      setSaving(null)
    }
  }

  async function removeRow(mapId: string) {
    setRemoving(mapId)
    try {
      const res = await fetch(
        `${API}/api/admin/products/${patternId}/variants/${variantId}/supplier-mappings/${mapId}`,
        { method: 'DELETE', headers }
      )
      if (!res.ok) throw new Error(`Remove failed (${res.status})`)
      setRows(prev => prev.filter(r => r.id !== mapId))
      toast.success('Supplier mapping removed')
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to remove')
    } finally {
      setRemoving(null)
    }
  }

  if (loading) {
    return <div className="h-12 bg-zinc-100 rounded animate-pulse" />
  }

  const hasRows = rows.length > 0 || drafts.length > 0

  return (
    <div className="space-y-3">
      {hasRows ? (
        <div className="rounded-lg border border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm min-w-215">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">Supplier Name</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Connection</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Supplier SKU</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">Our SKU Match</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Supplier Cost (Sync)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-36">Available Qty (Sync)</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">

              {/* Saved rows (approved mappings) */}
              {rows.map(row => (
                <tr key={row.id} className="odd:bg-background even:bg-muted/30 hover:bg-muted/60 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="text-sm text-zinc-800">{row.supplier_name ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 border-zinc-200">
                      {CONNECTION_LABELS[(row.connection_type as ConnectionType)] ?? row.connection_type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-zinc-700">{row.supplier_sku ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      readOnly
                      value={ourSkuMatch}
                      className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <SyncField value={row.synced_price != null ? String(row.synced_price) : '0'} />
                  </td>
                  <td className="px-3 py-2.5">
                    <SyncField value={row.synced_qty != null ? String(row.synced_qty) : '0'} />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      disabled={removing === row.id}
                      onClick={() => removeRow(row.id)}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 font-medium"
                    >
                      {removing === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))}

              {/* Draft rows (being filled in) */}
              {drafts.map(draft => (
                <tr key={draft.key} className="bg-blue-50/30">
                  <td className="px-3 py-2.5">
                    <SupplierSearch
                      value={draft.supplier_name}
                      onChange={v => updateDraft(draft.key, { supplier_name: v, supplier_id: '' })}
                      onSelect={s => updateDraft(draft.key, {
                        supplier_id:     s.supplier_id,
                        supplier_name:   s.supplier_name,
                        connection_type: (s.connection_type as ConnectionType) ?? 'manual',
                      })}
                      accessToken={token}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={draft.connection_type}
                      onChange={e => updateDraft(draft.key, { connection_type: e.target.value as ConnectionType })}
                      className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="api_link">API Link</option>
                      <option value="edi">EDI</option>
                      <option value="csv">Manual CSV</option>
                      <option value="manual">Manual CSV</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="text"
                      placeholder="Supplier Code"
                      value={draft.supplier_sku}
                      onChange={e => updateDraft(draft.key, { supplier_sku: e.target.value })}
                      className="w-full rounded border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <input readOnly value={ourSkuMatch} className="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500" />
                  </td>
                  <td className="px-3 py-2.5">
                    <SyncField value="0" />
                  </td>
                  <td className="px-3 py-2.5">
                    <SyncField value="0" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveDraft(draft)}
                        disabled={saving === draft.key}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                      >
                        {saving === draft.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => removeDraft(draft.key)}
                        className="text-zinc-400 hover:text-zinc-600"
                        aria-label="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
          No supplier lines mapped yet
        </p>
      )}

      <button
        type="button"
        onClick={addDraft}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        + Map New Supplier Line
      </button>
    </div>
  )
}
