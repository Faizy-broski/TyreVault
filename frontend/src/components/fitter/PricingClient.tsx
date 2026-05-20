'use client'

import { useState, useEffect } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { FitterPricingRow, PricingMatrix, TyreType, RimRange } from '@/types/fitter.types'
import { TYRE_TYPES, RIM_RANGES, emptyPricingMatrix } from '@/types/fitter.types'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'

function PriceInput({ value, onChange, placeholder = '0.00' }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <Input
      type="number"
      min={0}
      step={0.01}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-8 text-sm text-right border-zinc-200 bg-zinc-50 focus-visible:ring-primary/30 focus-visible:border-primary focus-visible:bg-white transition-colors"
    />
  )
}

function TableSkeleton() {
  return Array.from({ length: 4 }).map((_, i) => (
    <TableRow key={i} className="border-zinc-50">
      <TableCell className="py-2.5"><Skeleton className="h-4 w-16" /></TableCell>
      {Array.from({ length: 4 }).map((__, j) => (
        <TableCell key={j} className="py-2.5 px-2"><Skeleton className="h-8 w-full rounded-md" /></TableCell>
      ))}
      <TableCell className="py-2.5" />
    </TableRow>
  ))
}

function buildMatrix(rows: FitterPricingRow[]): PricingMatrix {
  const matrix = emptyPricingMatrix()
  for (const row of rows) {
    const t = row.tyre_type as TyreType
    const r = row.rim_range as RimRange
    if (matrix[t] && matrix[t][r] !== undefined) {
      matrix[t][r] = {
        per_tyre:     row.per_tyre     != null ? String(row.per_tyre)     : '',
        per_pair:     row.per_pair     != null ? String(row.per_pair)     : '',
        per_set_of_4: row.per_set_of_4 != null ? String(row.per_set_of_4) : '',
        callout_fee:  row.callout_fee  != null ? String(row.callout_fee)  : '',
      }
    }
  }
  return matrix
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function PricingClient({ accessToken }: { accessToken: string }) {
  const [matrix,  setMatrix]  = useState<PricingMatrix>(emptyPricingMatrix)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch(`${API}/api/fitter/portal/pricing`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((rows: FitterPricingRow[]) => setMatrix(buildMatrix(rows)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  function handleChange(
    tyreType: TyreType, rimRange: RimRange,
    field: 'per_tyre' | 'per_pair' | 'per_set_of_4' | 'callout_fee',
    value: string
  ) {
    setMatrix(prev => ({
      ...prev,
      [tyreType]: { ...prev[tyreType], [rimRange]: { ...prev[tyreType][rimRange], [field]: value } },
    }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true); setError('')
    const rows = TYRE_TYPES.flatMap(t =>
      RIM_RANGES.map(r => {
        const cell = matrix[t.key][r.key]
        return {
          tyre_type:    t.key,
          rim_range:    r.key,
          per_tyre:     cell.per_tyre     ? parseFloat(cell.per_tyre)     : null,
          per_pair:     cell.per_pair     ? parseFloat(cell.per_pair)     : null,
          per_set_of_4: cell.per_set_of_4 ? parseFloat(cell.per_set_of_4) : null,
          callout_fee:  cell.callout_fee  ? parseFloat(cell.callout_fee)  : null,
        }
      })
    )
    try {
      const res = await fetch(`${API}/api/fitter/portal/pricing`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ rows }),
      })
      if (!res.ok) { setError('Failed to save pricing.'); return }
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 sm:p-6">
      <FitterBreadcrumb crumbs={[{ label: 'Pricing' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 mt-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Pricing</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Set your tyre fitting prices by rim size</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 rounded-lg bg-primary text-zinc-900 hover:bg-primary/90 font-semibold disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </Button>
      </div>

      {error && (
        <Alert className="mb-4 rounded-lg bg-red-50 border-red-200 text-red-700">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="mb-4 rounded-lg bg-green-50 border-green-200 text-green-700">
          <AlertDescription>Pricing saved successfully.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 min-w-0">
        {/* Pricing tables */}
        <div className="space-y-5">
          {TYRE_TYPES.map(tyreType => (
            <div key={tyreType.key} className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
                <h2 className="text-sm font-semibold text-zinc-900">{tyreType.label}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{tyreType.description}</p>
              </div>

              <div className="px-2 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
                      <TableHead className="px-3 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto">Rim Size</TableHead>
                      <TableHead className="px-3 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto text-center">Per Tyre ($)</TableHead>
                      <TableHead className="px-3 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto text-center">Per Pair ($)</TableHead>
                      <TableHead className="px-3 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto text-center">Set of 4 ($)</TableHead>
                      <TableHead className="px-3 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider h-auto text-center">Callout ($)</TableHead>
                      <TableHead className="w-9 h-auto py-3">
                        <span className="sr-only">Clear</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableSkeleton />
                    ) : (
                      RIM_RANGES.map((rim, rimIndex) => {
                        const cell = matrix[tyreType.key][rim.key]
                        return (
                          <TableRow key={rim.key} className={`border-zinc-100 hover:bg-amber-50/40 transition-colors duration-150 ${rimIndex % 2 === 1 ? 'bg-zinc-50/40' : 'bg-white'}`}>
                            <TableCell className="px-3 py-2 font-medium text-zinc-700 text-sm whitespace-nowrap">
                              {rim.label}
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <PriceInput
                                value={cell.per_tyre}
                                onChange={v => handleChange(tyreType.key, rim.key, 'per_tyre', v)}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <PriceInput
                                value={cell.per_pair}
                                onChange={v => handleChange(tyreType.key, rim.key, 'per_pair', v)}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <PriceInput
                                value={cell.per_set_of_4}
                                onChange={v => handleChange(tyreType.key, rim.key, 'per_set_of_4', v)}
                              />
                            </TableCell>
                            <TableCell className="px-2 py-2">
                              <PriceInput
                                value={cell.callout_fee}
                                onChange={v => handleChange(tyreType.key, rim.key, 'callout_fee', v)}
                              />
                            </TableCell>
                            <TableCell className="px-1 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setMatrix(prev => ({
                                  ...prev,
                                  [tyreType.key]: {
                                    ...prev[tyreType.key],
                                    [rim.key]: { per_tyre: '', per_pair: '', per_set_of_4: '', callout_fee: '' },
                                  },
                                }))}
                                className="h-7 w-7 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                title="Clear row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Tips */}
        <div className="shrink-0">
          <div className="rounded-2xl bg-primary p-5 xl:sticky xl:top-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Pricing Tips</h3>
            <ul className="space-y-2.5">
              {[
                'Competitive pricing helps you receive more job requests.',
                "Callout fees are added when you travel to the customer's location.",
                'Consider offering discounts for full set (4 tyres) installations.',
                'Prices should include basic fitting labor only.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 leading-relaxed">
                  <span className="mt-0.5 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
