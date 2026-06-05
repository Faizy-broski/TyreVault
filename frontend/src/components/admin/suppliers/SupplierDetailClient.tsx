'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import type { Supplier, PurchaseOrderListItem } from '@/types/admin.types'
import ColumnMapModal from './ColumnMapModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toastError, toastSuccess } from '@/lib/toast'
import { Pencil, Trash2, Plus } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  supplier:    Supplier
  accessToken: string
}

type Tab = 'overview' | 'purchase-orders' | 'stock' | 'import'

const PO_STATUS_STYLE: Record<string, string> = {
  draft:     'bg-zinc-100 text-zinc-600',
  ordered:   'bg-blue-50 text-blue-700',
  shipped:   'bg-amber-50 text-amber-700',
  arrived:   'bg-purple-50 text-purple-700',
  received:  'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

type StockRow = {
  id:                 string
  product_id:         string
  warehouse_id:       string | null
  available_stock:    number
  supplier_price:     number | null
  selling_allowed:    boolean
  lead_time_days:     number | null
  freight_rule_id:    string | null
  stock_last_updated: string | null
  skus: { sku: string; tyre_size_display: string } | null
}

type StockForm = {
  product_id:      string
  warehouse_id:    string
  available_stock: string
  supplier_price:  string
  selling_allowed: boolean
  lead_time_days:  string
}

const EMPTY_STOCK: StockForm = {
  product_id:      '',
  warehouse_id:    '',
  available_stock: '0',
  supplier_price:  '',
  selling_allowed: true,
  lead_time_days:  '',
}

export default function SupplierDetailClient({ supplier, accessToken }: Props) {
  const [tab, setTab]         = useState<Tab>('overview')
  const [isDragOver, setIsDragOver] = useState(false)
  const [csvHeaders, setCsvHeaders]   = useState<string[]>([])
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Purchase Orders tab state
  const [pos, setPos]           = useState<PurchaseOrderListItem[]>([])
  const [posLoading, setPosLoading] = useState(false)

  const fetchPos = useCallback(async () => {
    setPosLoading(true)
    try {
      const res = await fetch(
        `${API}/api/admin/purchase-orders?supplier_id=${supplier.supplier_id}`,
        { headers },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setPos(Array.isArray(body) ? body : (body.data ?? []))
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load purchase orders')
    } finally {
      setPosLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier.supplier_id, accessToken])

  useEffect(() => {
    if (tab === 'purchase-orders') fetchPos()
  }, [tab, fetchPos])

  // Stock tab state
  const [stock, setStock]         = useState<StockRow[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockDialog, setStockDialog]   = useState(false)
  const [editStock, setEditStock]       = useState<StockRow | null>(null)
  const [stockForm, setStockForm]       = useState<StockForm>(EMPTY_STOCK)
  const [savingStock, setSavingStock]   = useState(false)
  const [deleteStock, setDeleteStock]   = useState<StockRow | null>(null)
  const [deletingStock, setDeletingStock] = useState(false)

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  // ── Stock fetch ──────────────────────────────────────────────
  const fetchStock = useCallback(async () => {
    setStockLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/suppliers/${supplier.supplier_id}/stock`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStock(await res.json())
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to load stock')
    } finally {
      setStockLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier.supplier_id, accessToken])

  useEffect(() => {
    if (tab === 'stock') fetchStock()
  }, [tab, fetchStock])

  function openAddStock() {
    setEditStock(null)
    setStockForm(EMPTY_STOCK)
    setStockDialog(true)
  }

  function openEditStock(row: StockRow) {
    setEditStock(row)
    setStockForm({
      product_id:      row.product_id,
      warehouse_id:    row.warehouse_id ?? '',
      available_stock: String(row.available_stock),
      supplier_price:  row.supplier_price != null ? String(row.supplier_price) : '',
      selling_allowed: row.selling_allowed,
      lead_time_days:  row.lead_time_days != null ? String(row.lead_time_days) : '',
    })
    setStockDialog(true)
  }

  async function handleSaveStock() {
    if (!stockForm.product_id.trim()) return toastError('Product ID (SKU) is required')
    setSavingStock(true)
    try {
      const payload = {
        product_id:      stockForm.product_id.trim(),
        warehouse_id:    stockForm.warehouse_id || null,
        available_stock: Number(stockForm.available_stock),
        supplier_price:  stockForm.supplier_price !== '' ? Number(stockForm.supplier_price) : null,
        selling_allowed: stockForm.selling_allowed,
        lead_time_days:  stockForm.lead_time_days !== '' ? Number(stockForm.lead_time_days) : null,
      }
      const res = await fetch(`${API}/api/admin/suppliers/${supplier.supplier_id}/stock`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Save failed')
      }
      toastSuccess(editStock ? 'Stock updated' : 'Stock entry added')
      setStockDialog(false)
      fetchStock()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingStock(false)
    }
  }

  async function handleDeleteStock() {
    if (!deleteStock) return
    setDeletingStock(true)
    try {
      const res = await fetch(`${API}/api/admin/suppliers/${supplier.supplier_id}/stock/${deleteStock.id}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) throw new Error('Delete failed')
      toastSuccess('Stock entry removed')
      setDeleteStock(null)
      fetchStock()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingStock(false)
    }
  }

  // ── CSV import handlers ──────────────────────────────────────
  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const onDragLeave = useCallback(() => setIsDragOver(false), [])

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toastError('Please upload a .csv file')
      return
    }
    const reader = new FileReader()
    reader.onload = evt => {
      const text   = evt.target?.result as string
      const result = Papa.parse<Record<string, string>>(text, { header: true, preview: 1, skipEmptyLines: true })
      setCsvHeaders(result.meta.fields ?? [])
      setPendingFile(file)
      setShowModal(true)
    }
    reader.readAsText(file)
  }, [])

  const onDrop       = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }, [processFile])
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }, [processFile])

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      tab === t ? 'border-yellow-400 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
    }`

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/suppliers" className="text-sm text-zinc-400 hover:text-zinc-600">← Suppliers</Link>
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
          <Link
            href={`/admin/suppliers/${supplier.supplier_id}/mapping`}
            className="rounded-lg bg-zinc-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-zinc-700 transition-colors"
          >
            Open Mapping Interface →
          </Link>
          {(supplier.stats?.pending_review ?? 0) > 0 && (
            <Link
              href={`/admin/suppliers/${supplier.supplier_id}/review`}
              className="rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 hover:bg-amber-100"
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
      <div className="flex border-b border-zinc-200 overflow-x-auto">
        <Button type="button" variant="ghost" className={tabCls('overview')}        onClick={() => setTab('overview')}>Overview</Button>
        <Button type="button" variant="ghost" className={tabCls('purchase-orders')} onClick={() => setTab('purchase-orders')}>
          Purchase Orders{pos.length > 0 && <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">{pos.length}</span>}
        </Button>
        <Button type="button" variant="ghost" className={tabCls('stock')}           onClick={() => setTab('stock')}>Supplier Stock</Button>
        <Button type="button" variant="ghost" className={tabCls('import')}          onClick={() => setTab('import')}>CSV Import</Button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {([
            ['Contact Name',   supplier.contact_name   ?? '—'],
            ['Email',          supplier.contact_email  ?? '—'],
            ['Phone',          supplier.contact_phone  ?? '—'],
            ['State',          supplier.state          ?? '—'],
            ['Country',        supplier.country        ?? '—'],
            ['Payment Terms',  supplier.payment_terms  ?? '—'],
            ['Stock Access',   supplier.stock_access_type?.replace(/_/g, ' ') ?? '—'],
            ['API Connected',  supplier.api_connected ? 'Yes' : 'No'],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-xs font-medium text-zinc-500 w-36">{label}</span>
              <span className="text-sm text-zinc-900 flex-1">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Orders tab */}
      {tab === 'purchase-orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Purchase Orders</h2>
              <p className="text-xs text-zinc-500 mt-0.5">All POs raised against this supplier</p>
            </div>
            <Link
              href={`/admin/purchase-orders/new`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New PO
            </Link>
          </div>

          {posLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : pos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-xs text-zinc-400">
              No purchase orders yet for this supplier.
            </p>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">PO Number</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Order Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">ETA</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">Warehouse</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Items</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Total</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 [&_tr:nth-child(even)]:bg-zinc-100 [&_tr:nth-child(odd)]:bg-white [&_tr:hover]:bg-amber-50 [&_tr]:transition-colors">
                  {pos.map(po => (
                    <tr key={po.po_id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">{po.po_number}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PO_STATUS_STYLE[po.po_status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {po.po_status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">{fmtDate(po.order_date)}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">{fmtDate(po.eta_date)}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600">{po.warehouses?.warehouse_name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums">{po.purchase_order_items.length}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium">
                        {po.total_cost != null ? `${po.currency} ${Number(po.total_cost).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/purchase-orders/${po.po_id}`}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier Stock tab */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Supplier Product Stock</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Manage per-SKU stock entries for this supplier</p>
            </div>
            <Button type="button" size="sm" onClick={openAddStock}>
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          </div>

          {stockLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : stock.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-200 py-8 text-center text-xs text-zinc-400">
              No stock entries yet. Add entries manually or via CSV import.
            </p>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500">SKU</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Available</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Price</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-zinc-500">Selling</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Lead (days)</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500">Updated</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 [&_tr:nth-child(even)]:bg-zinc-100 [&_tr:nth-child(odd)]:bg-white [&_tr:hover]:bg-amber-50 [&_tr]:transition-colors">
                  {stock.map(row => (
                    <tr key={row.id} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs text-zinc-700">{row.skus?.sku ?? row.product_id}</p>
                        <p className="text-xs text-zinc-400">{row.skus?.tyre_size_display ?? ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.available_stock}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {row.supplier_price != null ? `A$${Number(row.supplier_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${row.selling_allowed ? 'bg-green-500' : 'bg-zinc-300'}`} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{row.lead_time_days ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400">
                        {row.stock_last_updated ? new Date(row.stock_last_updated).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button type="button" onClick={() => openEditStock(row)} className="text-zinc-400 hover:text-zinc-700">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteStock(row)} className="text-zinc-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* CSV Import tab */}
      {tab === 'import' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Upload a CSV exported from your supplier. You'll map the columns before the import runs.
          </p>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-12 flex flex-col items-center justify-center gap-3 ${
              isDragOver ? 'border-yellow-400 bg-yellow-50' : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100'
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
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" aria-label="Upload CSV file" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {/* Stock add/edit dialog */}
      <Dialog open={stockDialog} onOpenChange={setStockDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editStock ? 'Edit Stock Entry' : 'Add Stock Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Product ID (SKU UUID) <span className="text-red-500">*</span></label>
              <Input
                value={stockForm.product_id}
                onChange={e => setStockForm(f => ({ ...f, product_id: e.target.value }))}
                placeholder="paste product_id UUID…"
                disabled={!!editStock}
                className={editStock ? 'bg-zinc-50' : ''}
              />
              {!editStock && <p className="text-xs text-zinc-400 mt-1">Find the product_id from the SKU detail page</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Supplier Warehouse ID</label>
              <Input
                value={stockForm.warehouse_id}
                onChange={e => setStockForm(f => ({ ...f, warehouse_id: e.target.value }))}
                placeholder="warehouse UUID (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Available Stock</label>
                <Input
                  type="number" min={0}
                  value={stockForm.available_stock}
                  onChange={e => setStockForm(f => ({ ...f, available_stock: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Supplier Price (A$)</label>
                <Input
                  type="number" min={0} step="0.01"
                  value={stockForm.supplier_price}
                  onChange={e => setStockForm(f => ({ ...f, supplier_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Lead Time (days)</label>
              <Input
                type="number" min={0}
                value={stockForm.lead_time_days}
                onChange={e => setStockForm(f => ({ ...f, lead_time_days: e.target.value }))}
                placeholder="e.g. 3"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={stockForm.selling_allowed}
                onClick={() => setStockForm(f => ({ ...f, selling_allowed: !f.selling_allowed }))}
                className={`relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors ${stockForm.selling_allowed ? 'bg-primary' : 'bg-zinc-300'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${stockForm.selling_allowed ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <span className="text-sm text-zinc-700">Allow selling this supplier stock on website</span>
            </label>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setStockDialog(false)}>Cancel</Button>
              <Button type="button" disabled={savingStock} onClick={handleSaveStock}>
                {savingStock ? 'Saving…' : editStock ? 'Save Changes' : 'Add Entry'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete stock confirmation */}
      <Dialog open={!!deleteStock} onOpenChange={open => !open && setDeleteStock(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Stock Entry?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-600 mt-1">
            Stock entry for <strong>{deleteStock?.skus?.tyre_size_display ?? deleteStock?.product_id}</strong> will be removed.
          </p>
          <div className="flex gap-3 justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteStock(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deletingStock} onClick={handleDeleteStock}>
              {deletingStock ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

