'use client'

import { useState, useEffect, useRef } from 'react'
import type { ImportJobStatus } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const REQUIRED_FIELDS = [
  { key: 'size_raw',        label: 'Size (raw)',      required: true  },
  { key: 'brand_name',      label: 'Brand',           required: true  },
  { key: 'pattern_name',    label: 'Pattern',         required: true  },
  { key: 'supplier_sku',    label: 'Supplier SKU',    required: true  },
  { key: 'supplier_price',  label: 'Price',           required: true  },
  { key: 'supplier_stock',  label: 'Stock qty',       required: true  },
  { key: 'load_index',      label: 'Load Index',      required: false },
  { key: 'speed_rating',    label: 'Speed Rating',    required: false },
  { key: 'lead_time_days',  label: 'Lead Time (days)',required: false },
  { key: 'product_name',    label: 'Product Name',    required: false },
]

interface Props {
  supplierId:  string
  file:        File
  csvHeaders:  string[]
  accessToken: string
  onClose:     () => void
}

type Phase = 'map' | 'uploading' | 'polling' | 'done' | 'error'

export default function ColumnMapModal({ supplierId, file, csvHeaders, accessToken, onClose }: Props) {
  // columnMap[fieldKey] = selected CSV header
  const [columnMap, setColumnMap] = useState<Record<string, string>>(() => {
    // Auto-detect obvious header matches (case-insensitive)
    const autoMap: Record<string, string> = {}
    for (const field of REQUIRED_FIELDS) {
      const match = csvHeaders.find(h => h.toLowerCase().replace(/\s+/g, '_') === field.key)
      if (match) autoMap[field.key] = match
    }
    return autoMap
  })

  const [phase, setPhase]       = useState<Phase>('map')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId]       = useState<string | null>(null)
  const [result, setResult]     = useState<ImportJobStatus['result']>(null)
  const [error, setError]       = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up interval on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function validToSubmit() {
    return REQUIRED_FIELDS.filter(f => f.required).every(f => !!columnMap[f.key])
  }

  async function handleSubmit() {
    setPhase('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('column_map', JSON.stringify(columnMap))

      const res = await fetch(`${API}/api/admin/suppliers/${supplierId}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed (${res.status})`)
      }

      const { jobId: jid } = await res.json()
      setJobId(jid)
      setPhase('polling')
      startPolling(jid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPhase('error')
    }
  }

  function startPolling(jid: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/admin/suppliers/jobs/${jid}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) return
        const status: ImportJobStatus = await res.json()
        setProgress(status.progress ?? 0)

        if (status.state === 'completed') {
          clearInterval(pollRef.current!)
          setResult(status.result ?? null)
          setPhase('done')
        } else if (status.state === 'failed') {
          clearInterval(pollRef.current!)
          setError(status.failReason ?? 'Import job failed')
          setPhase('error')
        }
      } catch { /* network hiccup, continue polling */ }
    }, 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Map CSV Columns</h2>
          {phase === 'map' && (
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ---- Mapping phase ---- */}
        {phase === 'map' && (
          <>
            <p className="text-xs text-zinc-500">
              Match each field to the corresponding column header in your CSV file.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {REQUIRED_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="w-36 text-xs font-medium text-zinc-700 shrink-0">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <select
                    value={columnMap[field.key] ?? ''}
                    onChange={e => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
                  >
                    <option value="">— select column —</option>
                    {csvHeaders.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!validToSubmit()}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-sm text-white font-medium hover:bg-zinc-700 disabled:opacity-40"
              >
                Start Import
              </button>
            </div>
          </>
        )}

        {/* ---- Uploading phase ---- */}
        {phase === 'uploading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <svg className="w-8 h-8 text-zinc-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-zinc-600">Uploading CSV…</p>
          </div>
        )}

        {/* ---- Polling phase ---- */}
        {phase === 'polling' && (
          <div className="space-y-3 py-4">
            <p className="text-sm text-zinc-600 text-center">Processing import job…</p>
            <div className="h-2.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400 text-center">{progress}% complete</p>
          </div>
        )}

        {/* ---- Done phase ---- */}
        {phase === 'done' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium">Import complete</p>
            </div>
            {result && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-700">{result.auto_mapped}</p>
                  <p className="text-xs text-green-600">Auto-mapped</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-amber-700">{result.review_queue}</p>
                  <p className="text-xs text-amber-600">Needs review</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-lg font-bold text-zinc-600">{result.rejected}</p>
                  <p className="text-xs text-zinc-500">Rejected</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100">
                Close
              </button>
              {(result?.review_queue ?? 0) > 0 && (
                <a
                  href={`/admin/suppliers/${supplierId}/review`}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-sm text-white font-medium hover:bg-amber-500"
                >
                  Review mappings →
                </a>
              )}
            </div>
          </div>
        )}

        {/* ---- Error phase ---- */}
        {phase === 'error' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-sm font-medium">Import failed</p>
            </div>
            <p className="text-xs text-zinc-500">{error}</p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100">
                Close
              </button>
              <button
                onClick={() => setPhase('map')}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-sm text-white font-medium hover:bg-zinc-700"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
