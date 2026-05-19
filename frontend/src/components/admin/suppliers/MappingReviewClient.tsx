'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { SupplierMapping } from '@/types/admin.types'
import ManualMapModal from './ManualMapModal'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  supplierId:       string
  supplierName:     string
  initialMappings:  SupplierMapping[]
  initialTotal:     number
  accessToken:      string
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-zinc-400">—</span>
  }
  const pct = Math.round(score * 100)
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

export default function MappingReviewClient({
  supplierId,
  supplierName,
  initialMappings,
  initialTotal,
  accessToken,
}: Props) {
  const [mappings, setMappings]   = useState<SupplierMapping[]>(initialMappings)
  const [total, setTotal]         = useState(initialTotal)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [manualId, setManualId]   = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${accessToken}` }

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/admin/suppliers/${supplierId}/mappings?filter=pending&page=${p}`,
        { headers }
      )
      if (res.ok) {
        const body = await res.json()
        setMappings(body.data ?? [])
        setTotal(body.total ?? 0)
        setPage(p)
      }
    } finally { setLoading(false) }
  }, [supplierId])

  async function approve(mapId: string) {
    try {
      const res = await fetch(`${API}/api/admin/suppliers/mappings/${mapId}/approve`, {
        method: 'PATCH',
        headers,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Approve failed (${res.status})`)
      }
      removeRow(mapId)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to approve mapping')
    }
  }

  async function reject(mapId: string) {
    try {
      const res = await fetch(`${API}/api/admin/suppliers/mappings/${mapId}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Reject failed (${res.status})`)
      }
      removeRow(mapId)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to reject mapping')
    }
  }

  function removeRow(mapId: string) {
    setMappings(prev => prev.filter(m => m.id !== mapId))
    setTotal(prev => Math.max(0, prev - 1))
  }

  const PAGE_SIZE = 25
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/admin/suppliers/${supplierId}`} className="text-sm text-zinc-400 hover:text-zinc-600">
              ← {supplierName}
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Mapping Review</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{total} rows awaiting review</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-200">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-56">Supplier Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-56">Suggested Match</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 w-24">Confidence</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
            ) : mappings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-700">All caught up!</p>
                  <p className="text-xs text-zinc-400 mt-1">No mappings pending review.</p>
                </td>
              </tr>
            ) : (
              mappings.map(m => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  {/* Supplier raw data */}
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-zinc-900 text-xs">{m.supplier_size_raw ?? '—'}</p>
                    <p className="text-xs text-zinc-500">{m.supplier_brand_name ?? '—'} · {m.supplier_pattern_name ?? '—'}</p>
                    {m.supplier_sku && (
                      <p className="text-xs text-zinc-400 mt-0.5">SKU: {m.supplier_sku}</p>
                    )}
                    <div className="flex gap-2 mt-1">
                      {m.supplier_price != null && (
                        <span className="text-xs text-zinc-500">${m.supplier_price.toFixed(2)}</span>
                      )}
                      {m.supplier_stock != null && (
                        <span className="text-xs text-zinc-400">Qty: {m.supplier_stock}</span>
                      )}
                    </div>
                  </td>

                  {/* Suggested match */}
                  <td className="px-4 py-3 align-top">
                    {m.skus ? (
                      <>
                        <p className="font-medium text-zinc-900 text-xs">{m.skus.tyre_size_display}</p>
                        <p className="text-xs text-zinc-500">
                          {m.skus.brands?.brand_name ?? '—'} · {m.skus.patterns?.pattern_name ?? '—'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">SKU: {m.skus.sku}</p>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-400 italic">No match found</span>
                    )}
                  </td>

                  {/* Confidence */}
                  <td className="px-4 py-3 align-top">
                    <ConfidenceBadge score={m.match_confidence} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      {m.product_id && (
                        <button
                          onClick={() => approve(m.id)}
                          className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2.5 py-1 hover:bg-green-100 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => setManualId(m.id)}
                        className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1 hover:bg-blue-100 transition-colors"
                      >
                        Manual Map
                      </button>
                      <button
                        onClick={() => reject(m.id)}
                        className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-2.5 py-1 hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
            <span className="text-xs text-zinc-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => loadPage(page - 1)}
                className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => loadPage(page + 1)}
                className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 disabled:opacity-40 hover:bg-zinc-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual map modal */}
      {manualId && (
        <ManualMapModal
          mapId={manualId}
          accessToken={accessToken}
          onClose={() => setManualId(null)}
          onMapped={() => { setManualId(null); removeRow(manualId) }}
        />
      )}
    </div>
  )
}
