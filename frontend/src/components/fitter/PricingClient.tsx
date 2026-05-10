'use client'

import { useState } from 'react'
import type { FitterPricingRow, PricingMatrix, TyreType, RimRange } from '@/types/fitter.types'
import { TYRE_TYPES, RIM_RANGES, emptyPricingMatrix } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

interface Props {
  initialRows:  FitterPricingRow[]
  accessToken:  string
}

export default function PricingClient({ initialRows, accessToken }: Props) {
  const [matrix, setMatrix]     = useState<PricingMatrix>(() => buildMatrix(initialRows))
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

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
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

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

  const PriceInput = ({
    value, onChange, placeholder = '0.00',
  }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <input
      type="number"
      min={0}
      step={0.01}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm text-zinc-800 text-right focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 focus:bg-white transition-colors"
    />
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Pricing</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Set your tyre fitting prices by rim size</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-colors disabled:opacity-60"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 3v4H7V3M12 12v6m-3-3h6" />
          </svg>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Pricing saved successfully.</div>
      )}

      <div className="grid grid-cols-[1fr_280px] gap-6">
        {/* Left: Pricing tables */}
        <div className="space-y-5">
          {TYRE_TYPES.map(tyreType => (
            <div key={tyreType.key} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-900">{tyreType.label}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{tyreType.description}</p>
              </div>
              <div className="px-5 pb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="py-3 text-left text-xs font-medium text-zinc-500">Rim Size Range</th>
                      <th className="py-3 text-center text-xs font-medium text-zinc-500">Per Tyre ($)</th>
                      <th className="py-3 text-center text-xs font-medium text-zinc-500">Per Pair ($)</th>
                      <th className="py-3 text-center text-xs font-medium text-zinc-500">Per Set of 4 ($)</th>
                      <th className="py-3 text-center text-xs font-medium text-zinc-500">Callout Fee ($)</th>
                      <th className="py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {RIM_RANGES.map(rim => {
                      const cell = matrix[tyreType.key][rim.key]
                      return (
                        <tr key={rim.key}>
                          <td className="py-2.5 text-sm font-medium text-zinc-700">{rim.label}</td>
                          <td className="py-2.5 px-2">
                            <PriceInput
                              value={cell.per_tyre}
                              onChange={v => handleChange(tyreType.key, rim.key, 'per_tyre', v)}
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <PriceInput
                              value={cell.per_pair}
                              onChange={v => handleChange(tyreType.key, rim.key, 'per_pair', v)}
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <PriceInput
                              value={cell.per_set_of_4}
                              onChange={v => handleChange(tyreType.key, rim.key, 'per_set_of_4', v)}
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <PriceInput
                              value={cell.callout_fee}
                              onChange={v => handleChange(tyreType.key, rim.key, 'callout_fee', v)}
                            />
                          </td>
                          <td className="py-2.5 px-1">
                            <button
                              onClick={() => {
                                setMatrix(prev => ({
                                  ...prev,
                                  [tyreType.key]: {
                                    ...prev[tyreType.key],
                                    [rim.key]: { per_tyre: '', per_pair: '', per_set_of_4: '', callout_fee: '' },
                                  },
                                }))
                              }}
                              className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              title="Clear row"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Pricing Tips */}
        <div className="shrink-0">
          <div className="rounded-xl bg-yellow-400 p-5 sticky top-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Pricing Tips</h3>
            <ul className="space-y-2.5">
              {[
                'Competitive pricing helps you receive more job requests.',
                'Callout fees are added when you travel to the customer\'s location.',
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
