'use client'

import { useState } from 'react'
import { Check, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type SupplierMapping = {
  map_id:                string
  supplier_id:           string
  supplier_name:         string
  connection_type:       string
  supplier_sku:          string | null
  supplier_brand_name:   string | null
  supplier_pattern_name: string | null
  supplier_size_raw:     string | null
  supplier_price:        number | null
  supplier_stock:        number | null
  match_confidence:      number | null
  is_verified:           boolean
  synced_price:          number | null
  synced_qty:            number | null
  status:                'synced' | 'mapped' | 'pending_review'
}

type ProductRow = {
  product_id:        string
  sku:               string
  tyre_size_display: string
  brand_name:        string | null
  pattern_name:      string | null
  own_stock:         number
  supplier_mappings: SupplierMapping[]
}

interface Props {
  row:         ProductRow
  accessToken: string
  onApproved:  (mapId: string) => void
  onRemoved:   (mapId: string) => void
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-zinc-400">—</span>
  const pct = Math.round(score)
  const cls = pct >= 90 ? 'bg-green-50 text-green-700 border-green-200'
    : pct >= 70         ? 'bg-amber-50 text-amber-700 border-amber-200'
    :                     'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {pct}%
    </span>
  )
}

function ConnectionBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    api_link: 'bg-blue-50 text-blue-600 border-blue-200',
    edi:      'bg-purple-50 text-purple-600 border-purple-200',
    csv:      'bg-amber-50 text-amber-600 border-amber-200',
    manual:   'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  const label: Record<string, string> = {
    api_link: 'API', edi: 'EDI', csv: 'CSV', manual: 'Manual',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${map[type] ?? map.manual}`}>
      {label[type] ?? type}
    </span>
  )
}

function StatusPill({ status }: { status: SupplierMapping['status'] }) {
  const map = {
    synced:         { label: 'Synced',         cls: 'bg-green-50 text-green-700 border-green-200' },
    mapped:         { label: 'Mapped',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    pending_review: { label: 'Pending Review',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function InventoryProductRow({ row, accessToken, onApproved, onRemoved }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [busy, setBusy]           = useState<Record<string, 'approve' | 'remove'>>({})

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  const hasMappings = row.supplier_mappings.length > 0

  async function approve(mapId: string) {
    setBusy(p => ({ ...p, [mapId]: 'approve' }))
    try {
      const res = await fetch(`${API}/api/admin/inventory/mappings/${mapId}/approve`, { method: 'PATCH', headers })
      if (!res.ok) throw new Error()
      onApproved(mapId)
    } catch { /* toast handled by parent */ }
    finally { setBusy(p => { const n = { ...p }; delete n[mapId]; return n }) }
  }

  async function remove(mapId: string) {
    setBusy(p => ({ ...p, [mapId]: 'remove' }))
    try {
      const res = await fetch(`${API}/api/admin/inventory/mappings/${mapId}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error()
      onRemoved(mapId)
    } catch { /* toast handled by parent */ }
    finally { setBusy(p => { const n = { ...p }; delete n[mapId]; return n }) }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* ── OUR PRODUCT (left / header) ─────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 truncate">{row.tyre_size_display}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {row.brand_name ?? '—'} · {row.pattern_name ?? '—'}
          </p>
          <p className="text-xs font-mono text-zinc-400">{row.sku}</p>
          <div className="flex items-center gap-2 mt-1">
            {/* Own stock badge */}
            <span className="text-xs text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
              Own: {row.own_stock} units
            </span>

            {/* Supplier count badge */}
            {hasMappings ? (
              <span className="text-xs font-medium bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2 py-0.5">
                {row.supplier_mappings.length} supplier{row.supplier_mappings.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 border border-dashed border-zinc-300 rounded-full px-2 py-0.5">
                No suppliers mapped
              </span>
            )}
          </div>
        </div>

        {hasMappings && (
          collapsed
            ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            : <ChevronUp   className="w-4 h-4 text-zinc-400 shrink-0" />
        )}
      </div>

      {/* ── SUPPLIER MAPPINGS (right / body) ────────────────────── */}
      {hasMappings && !collapsed && (
        <div className="border-t border-zinc-100">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-4 py-2 text-left font-medium text-zinc-500">SUPPLIER</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">THEIR SKU</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">THEIR SIZE</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">CONFIDENCE</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">COST (SYNC)</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">QTY (SYNC)</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">STATUS</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">ACTIONS</th>
              </tr>
            </thead>
<<<<<<< Updated upstream
            <tbody className="divide-y divide-zinc-100">
              {row.supplier_mappings.map(m => (
                <tr key={m.map_id} className="hover:bg-zinc-50 transition-colors">
=======
            <tbody className="divide-y divide-zinc-200">
              {row.supplier_mappings.map(m => (
                <tr key={m.map_id} className="odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
>>>>>>> Stashed changes
                  {/* Supplier name + connection */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <ConnectionBadge type={m.connection_type} />
                      <span className="font-medium text-zinc-800">{m.supplier_name}</span>
                    </div>
                  </td>

                  {/* Their SKU */}
                  <td className="px-4 py-2.5 font-mono text-zinc-600">{m.supplier_sku ?? '—'}</td>

                  {/* Their size */}
                  <td className="px-4 py-2.5 text-zinc-600">
                    {m.supplier_size_raw ?? '—'}
                    {m.supplier_brand_name && (
                      <span className="block text-zinc-400">
                        {m.supplier_brand_name}{m.supplier_pattern_name ? ` · ${m.supplier_pattern_name}` : ''}
                      </span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-2.5"><ConfidenceBadge score={m.match_confidence} /></td>

                  {/* Synced cost */}
                  <td className="px-4 py-2.5 text-zinc-700">
                    {m.synced_price != null
                      ? `$${m.synced_price.toFixed(2)}`
                      : m.supplier_price != null
                        ? <span className="text-zinc-400">${m.supplier_price.toFixed(2)}</span>
                        : '—'}
                  </td>

                  {/* Synced qty */}
                  <td className="px-4 py-2.5 text-zinc-700 tabular-nums">
                    {m.synced_qty != null
                      ? m.synced_qty
                      : m.supplier_stock != null
                        ? <span className="text-zinc-400">{m.supplier_stock}</span>
                        : '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2.5"><StatusPill status={m.status} /></td>

                  {/* Actions */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {m.status === 'pending_review' && (
                        <button
                          disabled={!!busy[m.map_id]}
                          onClick={() => approve(m.map_id)}
                          className="inline-flex items-center gap-1 rounded bg-green-50 border border-green-200 text-green-700 px-2 py-1 hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          {busy[m.map_id] === 'approve'
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Check className="w-3 h-3" />}
                          Approve &amp; Sync
                        </button>
                      )}
                      <button
                        disabled={!!busy[m.map_id]}
                        onClick={() => remove(m.map_id)}
                        className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 text-red-600 px-2 py-1 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        {busy[m.map_id] === 'remove'
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2  className="w-3 h-3" />}
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
