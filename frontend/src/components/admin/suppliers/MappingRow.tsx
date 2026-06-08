'use client'

import { useState } from 'react'
import { Check, X, ArrowLeftRight, Loader2 } from 'lucide-react'
import type { MappingViewRow, MappingStatus } from '@/types/admin.types'

interface Props {
  row:         MappingViewRow
  accessToken: string
  onApprove:   (id: string) => void
  onReject:    (id: string) => void
  onManualMap: (id: string) => void
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-zinc-400">—</span>
  const pct = Math.round(score) // stored as 0-100
  const cls = pct >= 90
    ? 'bg-green-50 text-green-700 border-green-200'
    : pct >= 70
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {pct}%
    </span>
  )
}

function StatusPill({ status }: { status: MappingStatus }) {
  const map: Record<MappingStatus, { label: string; cls: string }> = {
    mapped_synced:  { label: 'Mapped · Synced',        cls: 'bg-green-50 text-green-700 border-green-200' },
    mapped:         { label: 'Mapped · Sync pending',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    pending_review: { label: 'Pending Review',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    unmatched:      { label: 'Unmatched',               cls: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function ConnectionBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    api_link: 'bg-blue-50 text-blue-700 border-blue-200',
    edi:      'bg-purple-50 text-purple-700 border-purple-200',
    csv:      'bg-amber-50 text-amber-700 border-amber-200',
    manual:   'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  const cls = map[type] ?? map.manual
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium uppercase ${cls}`}>
      {type.replace('_', ' ')}
    </span>
  )
}

export default function MappingRow({ row, onApprove, onReject, onManualMap }: Props) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  function handle(action: 'approve' | 'reject') {
    setBusy(action)
    if (action === 'approve') onApprove(row.id)
    else onReject(row.id)
  }

  const canApprove = row.status === 'pending_review' && row.product_id != null

  return (
    <tr className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors">
      {/* LEFT — Our internal product */}
      <td className="px-4 py-3 align-top w-[280px]">
        {row.skus ? (
          <div>
            <p className="text-xs font-semibold text-zinc-900">{row.skus.tyre_size_display}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {row.skus.brands?.brand_name ?? '—'} · {row.skus.patterns?.pattern_name ?? '—'}
            </p>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{row.skus.sku}</p>
            {row.synced_stock && (
              <p className="text-xs text-green-600 mt-1">
                Synced: {row.synced_stock.available_stock} units
                {row.synced_stock.supplier_price != null && ` · $${row.synced_stock.supplier_price.toFixed(2)}`}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs text-zinc-400 italic">No internal match</span>
        )}
      </td>

      {/* CENTRE — status + confidence */}
      <td className="px-3 py-3 align-middle text-center w-[160px]">
        <div className="flex flex-col items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4 text-zinc-300" />
          <ConfidenceBadge score={row.match_confidence} />
          <StatusPill status={row.status} />
        </div>
      </td>

      {/* RIGHT — Supplier catalogue row */}
      <td className="px-4 py-3 align-top w-[280px]">
        <p className="text-xs font-semibold text-zinc-900">{row.supplier_size_raw ?? '—'}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {row.supplier_brand_name ?? '—'} · {row.supplier_pattern_name ?? '—'}
        </p>
        {row.supplier_sku && (
          <p className="text-xs text-zinc-400 font-mono mt-0.5">SKU: {row.supplier_sku}</p>
        )}
        <div className="flex gap-3 mt-1">
          {row.supplier_price != null && (
            <span className="text-xs text-zinc-600">${row.supplier_price.toFixed(2)}</span>
          )}
          {row.supplier_stock != null && (
            <span className="text-xs text-zinc-400">Qty: {row.supplier_stock}</span>
          )}
          {row.lead_time_days != null && (
            <span className="text-xs text-zinc-400">{row.lead_time_days}d</span>
          )}
        </div>
      </td>

      {/* ACTIONS */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          {canApprove && (
            <button
              disabled={busy != null}
              onClick={() => handle('approve')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2.5 py-1.5 hover:bg-green-100 disabled:opacity-50 transition-colors"
            >
              {busy === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve
            </button>
          )}
          <button
            disabled={busy != null}
            onClick={() => onManualMap(row.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1.5 hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3" />
            {row.status === 'unmatched' ? 'Map' : 'Re-map'}
          </button>
          {row.status !== 'mapped_synced' && (
            <button
              disabled={busy != null}
              onClick={() => handle('reject')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-2.5 py-1.5 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {busy === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
              Reject
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
