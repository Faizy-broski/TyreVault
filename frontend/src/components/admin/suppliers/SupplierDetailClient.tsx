'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import type { Supplier } from '@/types/admin.types'
import ColumnMapModal from './ColumnMapModal'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/toast'

interface Props {
  supplier:    Supplier
  accessToken: string
}

type Tab = 'overview' | 'import'

export default function SupplierDetailClient({ supplier, accessToken }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [isDragOver, setIsDragOver] = useState(false)
  const [csvHeaders, setCsvHeaders]   = useState<string[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------
  // Drag-drop handlers (native HTML5)
  // -------------------------------------------------------
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragOver(false), [])

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toastError('Please upload a .csv file')
      return
    }
    // Read only first line to extract headers cheaply
    const reader = new FileReader()
    reader.onload = evt => {
      const text  = evt.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, {
        header:         true,
        preview:        1,
        skipEmptyLines: true,
      })
      const headers = result.meta.fields ?? []
      setCsvHeaders(headers)
      setPendingFile(file)
      setShowModal(true)
    }
    reader.readAsText(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = '' // reset so same file can be re-selected
  }, [processFile])

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-yellow-400 text-zinc-900'
        : 'border-transparent text-zinc-500 hover:text-zinc-700'
    }`

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/suppliers" className="text-sm text-zinc-400 hover:text-zinc-600">
              ← Suppliers
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">{supplier.supplier_name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5 capitalize">
            {supplier.supplier_type ?? 'Supplier'} · {supplier.country ?? ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${supplier.is_active ? 'text-green-700' : 'text-zinc-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${supplier.is_active ? 'bg-green-500' : 'bg-zinc-300'}`} />
            {supplier.is_active ? 'Active' : 'Inactive'}
          </span>
          {(supplier.stats?.pending_review ?? 0) > 0 && (
            <Link
              href={`/admin/suppliers/${supplier.supplier_id}/review`}
              className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              {supplier.stats!.pending_review} pending review →
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      {supplier.stats && (
        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-zinc-900">{supplier.stats.auto_mapped.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Auto-mapped SKUs</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-2xl font-bold text-amber-600">{supplier.stats.pending_review.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Pending review</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <Button type="button" variant="ghost" className={tabCls('overview')} onClick={() => setTab('overview')}>Overview</Button>
        <Button type="button" variant="ghost" className={tabCls('import')}   onClick={() => setTab('import')}>CSV Import</Button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {[
            ['Contact Name',   supplier.contact_name  ?? '—'],
            ['Email',          supplier.email         ?? '—'],
            ['Phone',          supplier.phone         ?? '—'],
            ['State',          supplier.state         ?? '—'],
            ['Country',        supplier.country       ?? '—'],
            ['Payment Terms',  supplier.payment_terms ?? '—'],
            ['Stock Access',   supplier.stock_access_type?.toUpperCase() ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-xs font-medium text-zinc-500 w-36">{label}</span>
              <span className="text-sm text-zinc-900 flex-1">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* CSV Import tab */}
      {tab === 'import' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Upload a CSV exported from your supplier. You'll map the columns before the import runs.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-12 flex flex-col items-center justify-center gap-3 ${
              isDragOver
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
            }`}
          >
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-700">Drop CSV file here</p>
              <p className="text-xs text-zinc-400 mt-0.5">or click to browse · max 10MB</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload CSV file"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Column map modal */}
      {showModal && pendingFile && (
        <ColumnMapModal
          supplierId={supplier.supplier_id}
          file={pendingFile}
          csvHeaders={csvHeaders}
          accessToken={accessToken}
          onClose={() => { setShowModal(false); setPendingFile(null) }}
        />
      )}
    </div>
  )
}
