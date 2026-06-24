'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import {
  Upload, Package, Tag, FolderOpen, ChevronRight, ArrowLeft,
  CheckCircle2, AlertTriangle, Loader2, Download, FileText, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { createClient } from '@/lib/supabase/client'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Field definitions ─────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; required: boolean }

const SKU_FIELDS: FieldDef[] = [
  // Required
  { key: 'sku',                    label: 'SKU',                        required: true  },
  { key: 'brand_name',             label: 'Brand Name',                 required: true  },
  { key: 'pattern_name',           label: 'Pattern Name',               required: true  },
  { key: 'tyre_size_display',      label: 'Tyre Size (display)',         required: true  },
  { key: 'country_of_origin',      label: 'Country of Origin',          required: true  },
  { key: 'retail_price_inc_gst',   label: 'Retail Price (inc GST)',      required: true  },
  // Optional — pattern-level
  { key: 'application_type',       label: 'Application Type',           required: false },
  { key: 'season_type',            label: 'Season Type',                required: false },
  { key: 'performance_category',   label: 'Performance Category',       required: false },
  { key: 'position_category',      label: 'Position Category',          required: false },
  { key: 'shoulder_type',          label: 'Shoulder Type',              required: false },
  { key: 'terrain_type',           label: 'Terrain Type',               required: false },
  { key: 'pattern_description',    label: 'Pattern Description',        required: false },
  { key: 'pattern_short_description', label: 'Pattern Short Description', required: false },
  { key: 'default_country_of_origin', label: 'Default Country of Origin', required: false },
  { key: 'warranty_km',            label: 'Warranty (km)',              required: false },
  { key: 'on_sale',                label: 'On Sale (true/false)',        required: false },
  { key: 'discountable',           label: 'Discountable (true/false)',   required: false },
  { key: 'tags',                   label: 'Tags (semicolon-separated)', required: false },
  // Optional — SKU-level
  { key: 'width',                  label: 'Width (mm)',                 required: false },
  { key: 'profile',                label: 'Profile (%)',                required: false },
  { key: 'rim_size',               label: 'Rim Size (inch)',            required: false },
  { key: 'special_size',           label: 'Special Size',               required: false },
  { key: 'barcode_ean',            label: 'Barcode / EAN',              required: false },
  { key: 'lt_sizing',              label: 'LT Sizing (true/false)',      required: false },
  { key: 'construction_type',      label: 'Construction Type (R/ZR/D/B)', required: false },
  { key: 'load_index',             label: 'Load Index',                 required: false },
  { key: 'speed_rating',           label: 'Speed Rating',               required: false },
  { key: 'xl_reinforced',          label: 'XL Reinforced (true/false)', required: false },
  { key: 'runflat',                label: 'Runflat (true/false)',        required: false },
  { key: 'ply_rating',             label: 'Ply Rating',                 required: false },
  { key: 'load_range',             label: 'Load Range',                 required: false },
  { key: 'sidewall',               label: 'Sidewall (BSW/OWL/RWL/WSW)', required: false },
  { key: 'tube_type',              label: 'Tube Type (tubeless/tube_type)', required: false },
  { key: 'factory_name',           label: 'Factory Name',               required: false },
  { key: 'factory_country',        label: 'Factory Country',            required: false },
  { key: 'manufacturer_name',      label: 'Manufacturer Name',          required: false },
  { key: 'tread_depth',            label: 'Tread Depth (mm)',           required: false },
  { key: 'tyre_weight',            label: 'Tyre Weight (kg)',           required: false },
  { key: 'overall_diameter',       label: 'Overall Diameter (mm)',      required: false },
  { key: 'section_width',          label: 'Section Width (mm)',         required: false },
  { key: 'max_load',               label: 'Max Load',                   required: false },
  { key: 'max_pressure',           label: 'Max Pressure',               required: false },
  { key: 'wet_grip',               label: 'Wet Grip (A-G)',             required: false },
  { key: 'fuel_rating',            label: 'Fuel Rating (A-G)',          required: false },
  { key: 'noise_db',               label: 'Noise (dB)',                 required: false },
  { key: 'noise_class',            label: 'Noise Class',                required: false },
  { key: 'e_mark',                 label: 'E-Mark',                     required: false },
  { key: 'dot_code',               label: 'DOT Code',                   required: false },
  { key: 'utqg',                   label: 'UTQG Rating',                required: false },
  { key: 'status',                 label: 'Status (active/inactive)',   required: false },
  { key: 'cost_price',             label: 'Cost Price',                 required: false },
  { key: 'compare_at_price',       label: 'Compare-at Price',           required: false },
  { key: 'wholesale_price_inc_gst', label: 'Wholesale Price (inc GST)', required: false },
  { key: 'warehouse_name',         label: 'Warehouse Name',             required: false },
  { key: 'available_stock',        label: 'Available Stock',            required: false },
  { key: 'seo_title',              label: 'SEO Title',                  required: false },
  { key: 'seo_description',        label: 'SEO Description',            required: false },
]

const BRAND_FIELDS: FieldDef[] = [
  { key: 'brand_name',             label: 'Brand Name',                  required: true  },
  { key: 'brand_slug',             label: 'Brand Slug (auto if blank)',   required: false },
  { key: 'brand_positioning',      label: 'Positioning (budget/mid_range/premium/commercial)', required: false },
  { key: 'country_of_brand',       label: 'Country of Brand',            required: false },
  { key: 'manufacturer_name',      label: 'Manufacturer Name',           required: false },
  { key: 'brand_description',      label: 'Description',                 required: false },
  { key: 'brand_short_description', label: 'Short Description',          required: false },
  { key: 'is_active',              label: 'Is Active (true/false)',       required: false },
  { key: 'show_on_website',        label: 'Show on Website (true/false)', required: false },
  { key: 'channel_retail',         label: 'Channel: Retail (true/false)', required: false },
  { key: 'channel_wholesale',      label: 'Channel: Wholesale (true/false)', required: false },
  { key: 'channel_marketplaces',   label: 'Channel: Marketplaces (true/false)', required: false },
  { key: 'warranty_info',          label: 'Warranty Info',               required: false },
  { key: 'seo_title',              label: 'SEO Title',                   required: false },
  { key: 'seo_description',        label: 'SEO Description',             required: false },
]

const CATEGORY_FIELDS: FieldDef[] = [
  { key: 'category_name',          label: 'Category Name',               required: true  },
  { key: 'category_type',          label: 'Type (season/application/performance/position/terrain)', required: true },
  { key: 'category_slug',          label: 'Slug (auto if blank)',         required: false },
  { key: 'parent_category_name',   label: 'Parent Category Name',        required: false },
  { key: 'description',            label: 'Description',                 required: false },
  { key: 'sort_order',             label: 'Sort Order',                  required: false },
  { key: 'is_active',              label: 'Is Active (true/false)',       required: false },
  { key: 'hidden_from_website',    label: 'Hidden from Website (true/false)', required: false },
]

const PATTERN_FIELDS: FieldDef[] = [
  { key: 'brand_name',                 label: 'Brand Name',                                        required: true  },
  { key: 'pattern_name',               label: 'Pattern Name',                                      required: true  },
  { key: 'pattern_slug',               label: 'Pattern Slug (auto if blank)',                       required: false },
  { key: 'application_type',           label: 'Application Type (PCR/4x4/TBR/ATV/industrial)',     required: false },
  { key: 'season_type',                label: 'Season Type (all_season/summer/winter)',             required: false },
  { key: 'performance_category',       label: 'Performance Category',                              required: false },
  { key: 'position_category',          label: 'Position Category (front/rear/all_position)',       required: false },
  { key: 'shoulder_type',              label: 'Shoulder Type',                                     required: false },
  { key: 'terrain_type',               label: 'Terrain Type',                                      required: false },
  { key: 'pattern_description',        label: 'Pattern Description',                               required: false },
  { key: 'pattern_short_description',  label: 'Pattern Short Description',                         required: false },
  { key: 'default_country_of_origin',  label: 'Default Country of Origin',                         required: false },
  { key: 'warranty_km',                label: 'Warranty (km)',                                      required: false },
  { key: 'on_sale',                    label: 'On Sale (true/false)',                               required: false },
  { key: 'discountable',               label: 'Discountable (true/false)',                          required: false },
  { key: 'tags',                       label: 'Tags (semicolon-separated)',                         required: false },
  { key: 'is_active',                  label: 'Is Active (true/false)',                             required: false },
  { key: 'show_on_website',            label: 'Show on Website (true/false)',                       required: false },
  { key: 'seo_title',                  label: 'SEO Title',                                          required: false },
  { key: 'seo_description',            label: 'SEO Description',                                    required: false },
]

// ── Import mode config ────────────────────────────────────────────────────────

type ImportMode = 'skus' | 'brands' | 'categories' | 'patterns'

const MODES: { mode: ImportMode; label: string; description: string; icon: React.ReactNode; template: string; fields: FieldDef[] }[] = [
  {
    mode:        'skus',
    label:       'Products / SKUs',
    description: 'One row per tyre SKU. Brands and patterns are auto-created if they don\'t exist.',
    icon:        <Package className="w-6 h-6" />,
    template:    '/templates/catalog-skus-template.csv',
    fields:      SKU_FIELDS,
  },
  {
    mode:        'brands',
    label:       'Brands',
    description: 'Bulk create or update brand records.',
    icon:        <Tag className="w-6 h-6" />,
    template:    '/templates/catalog-brands-template.csv',
    fields:      BRAND_FIELDS,
  },
  {
    mode:        'categories',
    label:       'Categories',
    description: 'Bulk create or update categories. Parent categories are resolved by name.',
    icon:        <FolderOpen className="w-6 h-6" />,
    template:    '/templates/catalog-categories-template.csv',
    fields:      CATEGORY_FIELDS,
  },
  {
    mode:        'patterns',
    label:       'Patterns',
    description: 'Bulk create or update tyre patterns. Brand is resolved by name and created if missing.',
    icon:        <FileText className="w-6 h-6" />,
    template:    '/templates/catalog-patterns-template.csv',
    fields:      PATTERN_FIELDS,
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type ImportResult = {
  created: number
  updated: number
  skipped: number
  errors:  { row: number; identifier?: string; reason: string }[]
}

type JobStatus = {
  state:      string
  progress:   number
  result:     ImportResult | null
  failReason: string | null
}

type Step = 1 | 2 | 3 | 4

// ── Main component ─────────────────────────────────────────────────────────────

export default function CatalogImportPage() {
  const searchParams = useSearchParams()
  const typeParam    = searchParams.get('type')
  const initialMode  = (typeParam ?? 'skus') as ImportMode

  const [step,      setStep]      = useState<Step>(typeParam ? 2 : 1)
  const [mode,      setMode]      = useState<ImportMode>(initialMode)
  const [file,      setFile]      = useState<File | null>(null)
  const [headers,   setHeaders]   = useState<string[]>([])
  const [preview,   setPreview]   = useState<Record<string, string>[]>([])
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  const [jobId,     setJobId]     = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [dragOver,  setDragOver]  = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null)

  const modeConfig = MODES.find(m => m.mode === mode)!

  // Auto-select mode from query param
  useEffect(() => {
    if (initialMode !== 'skus') setMode(initialMode)
  }, [initialMode])

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // Auto-map columns whose header matches a field key exactly (case-insensitive)
  function autoMap(hdrs: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    for (const field of modeConfig.fields) {
      const match = hdrs.find(h => h.toLowerCase().replace(/\s+/g, '_') === field.key)
      if (match) map[field.key] = match
    }
    return map
  }

  function handleFileSelect(f: File) {
    setFile(f)
    setUploadErr('')
    Papa.parse<Record<string, string>>(f, {
      header:         true,
      skipEmptyLines: true,
      preview:        6,
      complete: ({ data, meta }) => {
        const hdrs = (meta.fields ?? []).map(h => h.trim())
        setHeaders(hdrs)
        setPreview(data.slice(0, 5))
        setColumnMap(autoMap(hdrs))
      },
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  function requiredMapped(): boolean {
    return modeConfig.fields.filter(f => f.required).every(f => !!columnMap[f.key])
  }

  async function handleImport() {
    if (!file) return
    setUploading(true)
    setUploadErr('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''

      const formData = new FormData()
      formData.append('file', file)
      formData.append('column_map', JSON.stringify(columnMap))

      const res = await fetch(`${API}/api/admin/products/import/${mode}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Upload failed (${res.status})`)
      }
      const { jobId: jid } = await res.json()
      setJobId(jid)
      setStep(4)
      startPolling(jid, token)
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function startPolling(jid: string, token: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/admin/products/import/jobs/${jid}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const status: JobStatus = await res.json()
        setJobStatus(status)
        if (status.state === 'completed' || status.state === 'failed') {
          clearInterval(pollRef.current!)
        }
      } catch { /* network hiccup, keep polling */ }
    }, 2000)
  }

  function downloadErrors(errors: ImportResult['errors']) {
    const csv = ['row,identifier,reason', ...errors.map(e => `${e.row},"${e.identifier ?? ''}","${e.reason}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `import-errors-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function resetWizard() {
    if (pollRef.current) clearInterval(pollRef.current)
    setStep(1); setFile(null); setHeaders([]); setPreview([]); setColumnMap({})
    setJobId(null); setJobStatus(null); setUploading(false); setUploadErr('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Bulk Import' },
      ]} />

      <div className="flex items-center justify-between mt-5 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Bulk Catalog Import</h1>
          <p className="text-sm text-zinc-500 mt-0.5">CSV upload — idempotent upsert, safe to re-run</p>
        </div>
        <Link href="/admin/products">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </Button>
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {(['Choose type', 'Upload CSV', 'Map columns', 'Import'] as const).map((label, idx) => {
          const s = (idx + 1) as Step
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > s ? 'bg-green-500 text-white' :
                step === s ? 'bg-primary text-zinc-900' :
                'bg-zinc-200 text-zinc-500'
              }`}>{step > s ? '✓' : s}</div>
              <span className={step === s ? 'font-semibold text-zinc-900' : 'text-zinc-400'}>{label}</span>
              {idx < 3 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Choose type ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODES.map(m => (
            <button
              key={m.mode}
              type="button"
              onClick={() => { setMode(m.mode); setColumnMap({}); setStep(2) }}
              className="text-left rounded-2xl border-2 border-zinc-200 p-5 hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-100 group-hover:bg-primary flex items-center justify-center mb-3 transition-colors text-zinc-600 group-hover:text-zinc-900">
                {m.icon}
              </div>
              <p className="font-semibold text-zinc-900 mb-1">{m.label}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{m.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Upload CSV ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-sm text-zinc-600">
            <span>Import mode:</span>
            <span className="font-semibold text-zinc-900">{modeConfig.label}</span>
            <button type="button" onClick={() => setStep(1)} className="text-primary hover:underline text-xs">change</button>
          </div>

          {/* Drag-drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            {file ? (
              <div>
                <p className="font-semibold text-zinc-800">{file.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{(file.size / 1024).toFixed(0)} KB · {preview.length} rows previewed</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-zinc-700">Drop your CSV here or click to browse</p>
                <p className="text-xs text-zinc-400 mt-1">Max 10 MB · CSV only</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
          </div>

          {/* Template download */}
          <div className="flex items-center gap-2">
            <a href={modeConfig.template} download
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
              <Download className="w-3.5 h-3.5" />
              Download {modeConfig.label} template CSV
            </a>
            <span className="text-zinc-300">·</span>
            <span className="text-xs text-zinc-400">Headers match field keys exactly — use it as your starting point</span>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <p className="px-4 py-2 text-xs font-semibold text-zinc-500 bg-zinc-50 border-b border-zinc-100">Preview (first {preview.length} rows)</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-zinc-50">
                      {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-zinc-600 whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {headers.map(h => <td key={h} className="px-3 py-1.5 text-zinc-700 max-w-[200px] truncate">{row[h] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!file || headers.length === 0} className="bg-primary text-zinc-900 hover:bg-primary/90 font-semibold">
              Map Columns <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Map columns ─────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Map CSV columns to fields</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {modeConfig.fields.filter(f => f.required && columnMap[f.key]).length}
                  /{modeConfig.fields.filter(f => f.required).length} required mapped
                </span>
                <a href={modeConfig.template} download
                  className="text-xs text-primary hover:underline flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Template
                </a>
              </div>
            </div>

            <div className="divide-y divide-zinc-50 max-h-[520px] overflow-y-auto">
              {modeConfig.fields.map(field => (
                <div key={field.key} className="flex items-center gap-4 px-5 py-2.5">
                  <div className="w-56 shrink-0">
                    <p className="text-xs font-medium text-zinc-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">{field.key}</p>
                  </div>
                  <select
                    value={columnMap[field.key] ?? ''}
                    onChange={e => setColumnMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                      field.required && !columnMap[field.key] ? 'border-red-300 bg-red-50' : 'border-zinc-200'
                    }`}
                  >
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {columnMap[field.key] && (
                    <button type="button" onClick={() => setColumnMap(prev => { const n = { ...prev }; delete n[field.key]; return n })}
                      className="text-zinc-300 hover:text-zinc-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {uploadErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {uploadErr}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={handleImport}
              disabled={!requiredMapped() || uploading}
              className="bg-primary text-zinc-900 hover:bg-primary/90 font-semibold gap-2"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <>Start Import <Upload className="w-4 h-4" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Progress & results ──────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Progress */}
          {(!jobStatus || jobStatus.state === 'active' || jobStatus.state === 'waiting') && (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
              <p className="text-sm text-zinc-600">Processing import job…</p>
              <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden max-w-sm mx-auto">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(jobStatus?.progress ?? 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400">{jobStatus?.progress ?? 0}% complete</p>
            </div>
          )}

          {/* Completed */}
          {jobStatus?.state === 'completed' && jobStatus.result && (() => {
            const r = jobStatus.result
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <p className="font-semibold">Import complete</p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Created',  value: r.created, color: 'green' },
                    { label: 'Updated',  value: r.updated, color: 'blue'  },
                    { label: 'Skipped',  value: r.skipped, color: 'zinc'  },
                    { label: 'Errors',   value: r.errors.length, color: r.errors.length > 0 ? 'red' : 'zinc' },
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-xl p-4 text-center bg-${stat.color}-50 border border-${stat.color}-100`}>
                      <p className={`text-2xl font-black text-${stat.color}-700`}>{stat.value}</p>
                      <p className={`text-xs text-${stat.color}-600`}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {r.errors.length > 0 && (
                  <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
                      <p className="text-sm font-semibold text-zinc-800">
                        {r.errors.length} row{r.errors.length !== 1 ? 's' : ''} with errors
                      </p>
                      <button type="button" onClick={() => downloadErrors(r.errors)}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" /> Download errors CSV
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      <table className="text-xs w-full">
                        <thead className="sticky top-0 bg-zinc-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-zinc-500 font-medium">Row</th>
                            <th className="px-4 py-2 text-left text-zinc-500 font-medium">Identifier</th>
                            <th className="px-4 py-2 text-left text-zinc-500 font-medium">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {r.errors.map((e, i) => (
                            <tr key={i} className="hover:bg-zinc-50">
                              <td className="px-4 py-2 text-zinc-600">{e.row}</td>
                              <td className="px-4 py-2 text-zinc-700 font-mono">{e.identifier ?? '—'}</td>
                              <td className="px-4 py-2 text-red-600">{e.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Failed */}
          {jobStatus?.state === 'failed' && (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Import job failed</p>
                <p className="text-sm text-red-600 mt-1">{jobStatus.failReason ?? 'Unknown error'}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={resetWizard} className="gap-2">
              <Upload className="w-4 h-4" /> Import another file
            </Button>
            <Link href="/admin/products">
              <Button className="bg-primary text-zinc-900 hover:bg-primary/90 font-semibold">
                Back to Products
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
