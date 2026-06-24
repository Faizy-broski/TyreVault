'use client'

import { useState, useEffect } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'
import { Plus, Trash2 } from 'lucide-react'
import type { PurchaseOrder, Supplier, Warehouse } from '@/types/admin.types'
import { ProductSearchInput } from '@/components/admin/products/ProductSearchInput'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'CNY', 'JPY']

type CreateForm = {
  supplier_id:    string
  warehouse_id:   string
  order_date:     string
  shipment_date:  string
  eta_date:       string
  currency:       string
  exchange_rate:  string
  freight_cost:   string
  clearance_cost: string
  notes:          string
}

type LineItem = {
  product_id:       string
  quantity_ordered: string
  unit_cost:        string
  cbm_per_unit:     string
}

const EMPTY_FORM: CreateForm = {
  supplier_id:    '',
  warehouse_id:   '',
  order_date:     new Date().toISOString().slice(0, 10),
  shipment_date:  '',
  eta_date:       '',
  currency:       'AUD',
  exchange_rate:  '',
  freight_cost:   '',
  clearance_cost: '',
  notes:          '',
}

const EMPTY_LINE: LineItem = { product_id: '', quantity_ordered: '1', unit_cost: '', cbm_per_unit: '' }

const sel = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
const lbl = 'block text-xs font-medium text-zinc-700 mb-1'

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: (d: { po_id?: string; po_number?: string }) => void
  po?:     PurchaseOrder | null
}

export function PurchaseOrderSheet({ open, onClose, onSaved, po }: Props) {
  const isEdit = !!po

  const [suppliers, setSuppliers]   = useState<Pick<Supplier, 'supplier_id' | 'supplier_name'>[]>([])
  const [warehouses, setWarehouses] = useState<Pick<Warehouse, 'warehouse_id' | 'warehouse_name'>[]>([])
  const [form, setForm]             = useState<CreateForm>(EMPTY_FORM)
  const [lines, setLines]           = useState<LineItem[]>([{ ...EMPTY_LINE }])
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    async function loadMeta() {
      const tok = await getToken()
      const h = { Authorization: `Bearer ${tok}` }
      const [sRes, wRes] = await Promise.all([
        fetch(`${API}/api/admin/suppliers`, { headers: h }),
        fetch(`${API}/api/admin/orders/warehouses?all=true`, { headers: h }),
      ])
      if (sRes.ok) setSuppliers(await sRes.json())
      if (wRes.ok) setWarehouses(await wRes.json())
    }
    loadMeta()
  }, [])

  useEffect(() => {
    if (po) {
      setForm({
        supplier_id:    po.suppliers?.supplier_id ?? '',
        warehouse_id:   po.warehouses?.warehouse_id ?? '',
        order_date:     po.order_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        shipment_date:  po.shipment_date?.slice(0, 10) ?? '',
        eta_date:       po.eta_date?.slice(0, 10) ?? '',
        currency:       po.currency ?? 'AUD',
        exchange_rate:  po.exchange_rate != null ? String(po.exchange_rate) : '',
        freight_cost:   po.freight_cost  != null ? String(po.freight_cost)  : '',
        clearance_cost: po.clearance_cost != null ? String(po.clearance_cost) : '',
        notes:          po.notes ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
      setLines([{ ...EMPTY_LINE }])
    }
  }, [po])

  function setField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setLine(i: number, k: keyof LineItem, v: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }

  function addLine() { setLines(prev => [...prev, { ...EMPTY_LINE }]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }

  const estTotal = (
    lines.reduce((s, l) => s + (Number(l.unit_cost) || 0) * (Number(l.quantity_ordered) || 0), 0)
    + (Number(form.freight_cost) || 0)
    + (Number(form.clearance_cost) || 0)
  ).toFixed(2)

  async function handleSave() {
    if (!isEdit) {
      if (!form.supplier_id)  return toastError('Supplier is required')
      if (!form.warehouse_id) return toastError('Warehouse is required')
      if (!form.order_date)   return toastError('Order date is required')
      if (lines.length === 0) return toastError('Add at least one line item')
      if (lines.some(l => !l.product_id || !l.unit_cost)) return toastError('All line items need a Product ID and unit cost')
    }

    setSaving(true)
    try {
      const tok = await getToken()

      let res: Response
      if (isEdit) {
        const patch = {
          shipment_date:  form.shipment_date  || null,
          eta_date:       form.eta_date        || null,
          exchange_rate:  form.exchange_rate   ? Number(form.exchange_rate)  : null,
          freight_cost:   form.freight_cost    ? Number(form.freight_cost)   : null,
          clearance_cost: form.clearance_cost  ? Number(form.clearance_cost) : null,
          notes:          form.notes || null,
        }
        res = await fetch(`${API}/api/admin/purchase-orders/${po!.po_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify(patch),
        })
      } else {
        const payload = {
          supplier_id:    form.supplier_id,
          warehouse_id:   form.warehouse_id,
          order_date:     form.order_date,
          shipment_date:  form.shipment_date  || null,
          eta_date:       form.eta_date       || null,
          currency:       form.currency,
          exchange_rate:  form.exchange_rate  ? Number(form.exchange_rate)  : null,
          freight_cost:   form.freight_cost   ? Number(form.freight_cost)   : null,
          clearance_cost: form.clearance_cost ? Number(form.clearance_cost) : null,
          notes:          form.notes          || null,
          items: lines.map(l => ({
            product_id:       l.product_id.trim(),
            quantity_ordered: Number(l.quantity_ordered),
            unit_cost:        Number(l.unit_cost),
            cbm_per_unit:     l.cbm_per_unit ? Number(l.cbm_per_unit) : null,
          })),
        }
        res = await fetch(`${API}/api/admin/purchase-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Save failed')
      }
      const data = await res.json()
      toastSuccess(isEdit ? 'PO updated' : `PO ${data.po_number} created`)
      onSaved({ po_id: data.po_id, po_number: data.po_number })
      onClose()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit PO — ${po?.po_number}` : 'New Purchase Order'}
      width="w-full max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Purchase Order'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Order Details */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Order Details</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Supplier <span className="text-red-500">*</span></label>
              <select
                value={form.supplier_id}
                onChange={e => setField('supplier_id', e.target.value)}
                className={sel}
                disabled={isEdit}
              >
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Destination Warehouse <span className="text-red-500">*</span></label>
              <select
                value={form.warehouse_id}
                onChange={e => setField('warehouse_id', e.target.value)}
                className={sel}
                disabled={isEdit}
              >
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.warehouse_id} value={w.warehouse_id}>{w.warehouse_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Order Date <span className="text-red-500">*</span></label>
              <Input type="date" value={form.order_date} onChange={e => setField('order_date', e.target.value)} disabled={isEdit} />
            </div>
            <div>
              <label className={lbl}>Shipment Date (ETD)</label>
              <Input type="date" value={form.shipment_date} onChange={e => setField('shipment_date', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>ETA</label>
              <Input type="date" value={form.eta_date} onChange={e => setField('eta_date', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className={lbl}>Currency</label>
              <select value={form.currency} onChange={e => setField('currency', e.target.value)} className={sel} disabled={isEdit}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Exchange Rate</label>
              <Input type="number" step="0.0001" value={form.exchange_rate} onChange={e => setField('exchange_rate', e.target.value)} placeholder="1.0000" />
            </div>
            <div>
              <label className={lbl}>Freight Cost</label>
              <Input type="number" step="0.01" value={form.freight_cost} onChange={e => setField('freight_cost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Clearance Cost</label>
              <Input type="number" step="0.01" value={form.clearance_cost} onChange={e => setField('clearance_cost', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2} placeholder="Internal notes…" className="resize-none" />
          </div>
        </div>

        {/* Line Items (create mode only) */}
        {!isEdit && (
          <div className="space-y-3 border-t border-zinc-100 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Line Items</p>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add line
              </button>
            </div>

            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Product</th>
                    <th className="px-3 py-2.5 text-right font-medium text-zinc-500 w-20">Qty</th>
                    <th className="px-3 py-2.5 text-right font-medium text-zinc-500 w-28">Unit Cost</th>
                    <th className="px-3 py-2.5 text-right font-medium text-zinc-500 w-24">CBM/unit</th>
                    <th className="px-3 py-2.5 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lines.map((line, i) => (
                    <tr key={i} className="even:bg-zinc-50/50 hover:bg-amber-50/40 transition-colors">
                      <td className="px-3 py-2">
                        <ProductSearchInput
                          value={line.product_id}
                          onChange={val => setLine(i, 'product_id', val)}
                          placeholder="Search product..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={1}
                          value={line.quantity_ordered}
                          onChange={e => setLine(i, 'quantity_ordered', e.target.value)}
                          className="w-full border border-zinc-200 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} step="0.01"
                          value={line.unit_cost}
                          onChange={e => setLine(i, 'unit_cost', e.target.value)}
                          placeholder="0.00"
                          className="w-full border border-zinc-200 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} step="0.001"
                          value={line.cbm_per_unit}
                          onChange={e => setLine(i, 'cbm_per_unit', e.target.value)}
                          placeholder="0.000"
                          className="w-full border border-zinc-200 rounded-md px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(i)} className="text-zinc-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-sm text-zinc-500">
              Est. total:&nbsp;
              <span className="font-semibold text-zinc-900">{form.currency} {estTotal}</span>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  )
}
