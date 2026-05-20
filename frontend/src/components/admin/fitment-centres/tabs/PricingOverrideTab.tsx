'use client'

import { useState } from 'react'
import type { FitterPricingRow, TyreType, RimRange, PricingMatrix } from '@/types/fitter.types'
import { TYRE_TYPES, RIM_RANGES, emptyPricingMatrix } from '@/types/fitter.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  centreId:    string
  initialRows: FitterPricingRow[]
  accessToken: string
}

function buildMatrix(rows: FitterPricingRow[]): PricingMatrix {
  const matrix = emptyPricingMatrix()
  for (const row of rows) {
    const t = row.tyre_type as TyreType
    const r = row.rim_range as RimRange
    if (matrix[t]?.[r] !== undefined) {
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

function PriceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="number"
      min={0}
      step={0.01}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      className="w-full rounded-md border-zinc-200 bg-zinc-50 text-xs text-right focus:ring-primary/30 focus:border-primary focus:bg-white"
    />
  )
}

export default function PricingOverrideTab({ centreId, initialRows, accessToken }: Props) {
  const [matrix, setMatrix]   = useState<PricingMatrix>(() => buildMatrix(initialRows))
  const [expanded, setExpanded] = useState<Record<TyreType, boolean>>({
    car:      false,
    '4x4':    true,
    run_flat: false,
  })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }

  function handleChange(
    tyreType: TyreType, rimRange: RimRange,
    field: 'per_tyre' | 'per_pair' | 'per_set_of_4' | 'callout_fee',
    value: string
  ) {
    setMatrix(prev => ({
      ...prev,
      [tyreType]: {
        ...prev[tyreType],
        [rimRange]: { ...prev[tyreType][rimRange], [field]: value },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
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
      const res = await fetch(
        `${API}/api/admin/fitment-centres/${centreId}/pricing`,
        { method: 'PUT', headers, body: JSON.stringify({ rows }) }
      )
      if (!res.ok) { toastError('Failed to save pricing'); return }
      toastSuccess('Pricing saved')
      setEditing(false)
    } finally { setSaving(false) }
  }

  function toggleSection(key: TyreType) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function clearRow(tyreType: TyreType, rimRange: RimRange) {
    setMatrix(prev => ({
      ...prev,
      [tyreType]: {
        ...prev[tyreType],
        [rimRange]: { per_tyre: '', per_pair: '', per_set_of_4: '', callout_fee: '' },
      },
    }))
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Pricing Override</h2>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => { setEditing(false); setSaved(false) }}
              className="px-3 py-1.5 h-auto text-xs font-medium border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 h-auto text-xs font-semibold rounded-lg bg-yellow-400 text-zinc-900 hover:bg-yellow-500 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Pricing'}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 h-auto text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Edit Pricing
          </Button>
        )}
      </div>

      {/* Info banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription>
          <p className="text-xs font-semibold text-blue-800">Override System Pricing</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Set custom pricing for this specific center. These rates will override the default platform pricing.
          </p>
        </AlertDescription>
      </Alert>

      {/* Accordion sections */}
      <div className="space-y-3">
        {TYRE_TYPES.map(tyreType => (
          <div key={tyreType.key} className="rounded-xl border border-zinc-200 overflow-hidden">
            <button
              onClick={() => toggleSection(tyreType.key)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900">{tyreType.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{tyreType.description}</p>
              </div>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${expanded[tyreType.key] ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {expanded[tyreType.key] && (
              <div className="px-5 pb-5 border-t border-zinc-100">
                <div className="overflow-x-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                      <TableHead className="py-3 text-left text-xs font-medium text-zinc-500 w-28">Rim Size Range</TableHead>
                      <TableHead className="py-3 text-center text-xs font-medium text-zinc-500">Per Tyre ($)</TableHead>
                      <TableHead className="py-3 text-center text-xs font-medium text-zinc-500">Per Pair ($)</TableHead>
                      <TableHead className="py-3 text-center text-xs font-medium text-zinc-500">Per Set of 4 ($)</TableHead>
                      <TableHead className="py-3 text-center text-xs font-medium text-zinc-500">Callout Fee ($)</TableHead>
                      <TableHead className="py-3 w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-zinc-50">
                    {RIM_RANGES.map(rim => {
                      const cell = matrix[tyreType.key][rim.key]
                      return (
                        <TableRow key={rim.key}>
                          <TableCell className="py-2.5 text-xs font-medium text-zinc-700">{rim.label}</TableCell>
                          {(['per_tyre', 'per_pair', 'per_set_of_4', 'callout_fee'] as const).map(field => (
                            <TableCell key={field} className="py-2.5 px-2">
                              {editing ? (
                                <PriceInput
                                  value={cell[field]}
                                  onChange={v => handleChange(tyreType.key, rim.key, field, v)}
                                />
                              ) : (
                                <span className="block text-xs text-right text-zinc-700 px-2">
                                  {cell[field] ? `$${parseFloat(cell[field]).toFixed(2)}` : '—'}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="py-2.5 px-1">
                            {editing && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => clearRow(tyreType.key, rim.key)}
                                title="Clear row"
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
