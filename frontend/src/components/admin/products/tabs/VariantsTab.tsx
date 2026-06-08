'use client'

import { Fragment, useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import type { CreateProductFormValues, VariantFormValues } from '../schema'
import { normalizeTyreSize } from '@/lib/utils/size-normalizer'
import { Button } from '@/components/ui/button'
import VariantExpandedRow from './VariantExpandedRow'

const EMPTY_VARIANT: VariantFormValues = {
  sku: '',
  barcodeEan: '',
  tyreSizeDisplay: '',
  width: undefined,
  profile: undefined,
  rimSize: 0,
  specialSize: '',
  constructionType: undefined,
  speedRating: '',
  loadIndex: '',
  loadSpeedRating: '',
  fuelRating: '',
  wetGrip: '',
  noiseDb: '',
  noiseClass: '',
  runflat: false,
  xlReinforced: false,
  ltSizing: false,
  plyRating: '',
  loadRange: '',
  sidewall: undefined,
  tubeType: undefined,
  manufacturerName: '',
  countryOfOrigin: '',
  factoryName: '',
  factoryCountry: '',
  sectionWidth: undefined,
  treadDepth: undefined,
  tyreWeight: undefined,
  overallDiameter: undefined,
  maxLoad: '',
  maxPressure: '',
  eMark: '',
  dotCode: '',
  utqg: '',
  variantImages: [],
  status: 'active',
  replacementProductId: '',
}

const CONSTRUCTION_TYPES = ['R', 'ZR', 'D', '-']

export default function VariantsTab() {
  const { register, control, watch, setValue, formState: { errors } } =
    useFormContext<CreateProductFormValues>()
  const { fields, append, remove } = useFieldArray<CreateProductFormValues, 'variants'>({
    name: 'variants',
  })
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpand(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  function addVariant() {
    const newIndex = fields.length
    append(EMPTY_VARIANT)
    setExpanded(prev => new Set([...prev, newIndex]))
  }

  function handleSizeBlur(index: number, raw: string) {
    if (!raw) return
    try {
      normalizeTyreSize(raw)
      const metric = raw.match(/^(\d{2,3})[/\\](\d{2,3})[ZzRrDd-]?(\d{2,3})/i)
      if (metric) {
        setValue(`variants.${index}.width`,   Number(metric[1]))
        setValue(`variants.${index}.profile`, Number(metric[2]))
        setValue(`variants.${index}.rimSize`, Number(metric[3]))
        return
      }
      const imperial = raw.match(/^(\d{2,3})[xX](\d{2,3}(?:\.\d+)?)[Rr-](\d{2,3})/i)
      if (imperial) {
        setValue(`variants.${index}.width`,   Number(imperial[1]))
        setValue(`variants.${index}.profile`, Number(imperial[2]))
        setValue(`variants.${index}.rimSize`, Number(imperial[3]))
      }
    } catch {}
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { default: Papa } = await import('papaparse')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[]
        rows.forEach(row => {
          append({
            ...EMPTY_VARIANT,
            sku:             row.sku ?? row.SKU ?? '',
            tyreSizeDisplay: row.size ?? row.tire_size ?? row['Tire Size'] ?? '',
            width:           row.width ? Number(row.width) : undefined,
            profile:         row.profile ?? row.aspect_ratio ? Number(row.profile ?? row.aspect_ratio) : undefined,
            rimSize:         Number(row.rim_size ?? row['Rim Size'] ?? 0),
            constructionType: row.construction_type ?? row['Construction'] ?? undefined,
            speedRating:     row.speed_rating ?? row['Speed Rating'] ?? '',
            loadIndex:       row.load_index ?? row['Load Index'] ?? '',
            fuelRating:      row.fuel_rating ?? row['Fuel Rating'] ?? '',
            wetGrip:         row.wet ?? row['Wet'] ?? '',
            noiseDb:         row.noise ?? row['Noise'] ?? '',
            runflat:         row.run_flat === 'true' || row['Run Flat'] === 'true',
            countryOfOrigin: row.country_of_origin ?? row['Country'] ?? '',
          })
        })
      },
    })
    e.target.value = ''
  }

  const variantErrors = errors.variants
  // expand + 9 data cols + action = 11
  const COL_SPAN = 11

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Product Variants</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Add tyre variants manually or upload via CSV. New rows expand automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Bulk Upload CSV
            <input type="file" accept=".csv" className="sr-only" onChange={handleCsvUpload} />
          </label>
          <Button type="button" onClick={addVariant}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add variant
          </Button>
        </div>
      </div>

      {typeof variantErrors?.message === 'string' && (
        <p className="mb-3 text-sm text-red-600">{variantErrors.message}</p>
      )}

      {fields.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 rounded-xl py-16 text-center">
          <p className="text-sm text-zinc-400">No variants yet. Click "+ Add variant" or upload a CSV.</p>
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-primary/10">
                <th className="w-8 px-2 py-3" />
                {[
                  'Tire Size', 'SKU', 'Barcode (EAN)', 'Special Size',
                  'Width (mm)', 'Aspect Ratio', 'Rim Size (in)', 'Build',
                  'Country *', 'Action',
                ].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-bold text-zinc-800 uppercase tracking-wide whitespace-nowrap text-xs">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {fields.map((field, index) => (
                <Fragment key={field.id}>
                  {/* ── Summary row ──────────────────────────────── */}
                  <tr className={expanded.has(index) ? 'bg-muted/50' : 'odd:bg-white even:bg-zinc-50 hover:!bg-zinc-200 transition-colors'}>
                    {/* Expand toggle */}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        aria-label={expanded.has(index) ? 'Collapse row' : 'Expand row'}
                        onClick={() => toggleExpand(index)}
                        className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 hover:!bg-zinc-100 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-150 ${expanded.has(index) ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    </td>
                    {/* Tire Size */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`variants.${index}.tyreSizeDisplay`)}
                        onBlur={e => handleSizeBlur(index, e.target.value)}
                        placeholder="225/45R17"
                        className="w-28 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* SKU */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`variants.${index}.sku`)}
                        placeholder="MB-501"
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Barcode EAN */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`variants.${index}.barcodeEan`)}
                        placeholder="EAN"
                        className="w-28 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Special Size */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`variants.${index}.specialSize`)}
                        placeholder="33X12.50R17"
                        className="w-24 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Width */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        {...register(`variants.${index}.width`, { valueAsNumber: true })}
                        className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Aspect Ratio / Profile */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        {...register(`variants.${index}.profile`, { valueAsNumber: true })}
                        className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Rim Size */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        {...register(`variants.${index}.rimSize`, { valueAsNumber: true })}
                        className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Construction Type */}
                    <td className="px-3 py-2">
                      <select
                        {...register(`variants.${index}.constructionType`)}
                        className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">—</option>
                        {CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    {/* Country of Origin */}
                    <td className="px-3 py-2">
                      <input
                        {...register(`variants.${index}.countryOfOrigin`)}
                        placeholder="AU"
                        className="w-16 rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </td>
                    {/* Delete */}
                    <td className="px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove variant"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </Button>
                    </td>
                  </tr>

                  {/* ── Expanded detail row ───────────────────────── */}
                  {expanded.has(index) && (
                    <tr>
                      <td colSpan={COL_SPAN} className="px-6 py-5 bg-zinc-50 border-b border-zinc-100">
                        <VariantExpandedRow index={index} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

