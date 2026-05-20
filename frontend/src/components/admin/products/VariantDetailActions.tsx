'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminToken } from '@/lib/admin-token'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface StockRow { warehouse_id: string; warehouse_name: string; available_stock: number }
interface PriceRow { group_name: string; price_inc_gst: number }

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-lg flex flex-col max-h-[90vh]" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <DialogTitle className="text-base font-semibold text-zinc-900">{title}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// ── Edit Stock button + modal ──────────────────────────────────────────────

export function VariantStockActions({
  patternId,
  variantId,
  stocks,
  onSuccess,
}: {
  patternId: string
  variantId: string
  stocks: StockRow[]
  onSuccess?: () => void
}) {
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)

  const initial: Record<string, number> = {}
  for (const s of stocks) initial[s.warehouse_id] = s.available_stock
  const [values, setValues] = useState(initial)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = await getAdminToken()
      const results = await Promise.all(
        Object.entries(values).map(([warehouseId, stock]) =>
          fetch(`${API}/api/admin/products/${patternId}/variants/${variantId}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ warehouseId, availableStock: stock }),
          })
        )
      )
      const failed = results.find(r => !r.ok)
      if (failed) throw new Error(`Error ${failed.status}`)
      toastSuccess('Stock updated')
      onSuccess?.()
      setOpen(false)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit Stock
      </Button>

      <Modal title="Edit Stock Levels" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
            {stocks.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">No warehouse locations configured.</p>
            ) : (
              stocks.map(s => (
                <div key={s.warehouse_id} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-600 flex-1">{s.warehouse_name}</span>
                  <Input
                    type="number"
                    min={0}
                    value={values[s.warehouse_id] ?? s.available_stock}
                    onChange={e => setValues(prev => ({ ...prev, [s.warehouse_id]: Number(e.target.value) }))}
                    aria-label={`Stock at ${s.warehouse_name}`}
                    className="w-24"
                  />
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// ── Pricing card three-dot menu + edit modal ───────────────────────────────

export function VariantPricingMenu({
  patternId,
  variantId,
  prices,
  onSuccess,
}: {
  patternId: string
  variantId: string
  prices: PriceRow[]
  onSuccess?: () => void
}) {
  const [open, setOpen]         = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial: Record<string, number> = {}
  for (const p of prices) initial[p.group_name] = p.price_inc_gst
  const [values, setValues] = useState(initial)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const token = await getAdminToken()
      const res = await fetch(`${API}/api/admin/products/${patternId}/variants/${variantId}/prices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prices: values }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      toastSuccess('Prices updated')
      onSuccess?.()
      setShowEdit(false)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update prices')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div ref={ref} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Pricing options"
          onClick={() => setOpen(o => !o)}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setShowEdit(true) }}
              className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Edit Prices
            </button>
          </div>
        )}
      </div>

      <Modal title="Edit Prices" open={showEdit} onClose={() => setShowEdit(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
            {prices.length === 0 ? (
              <p className="text-sm text-zinc-400 italic">No prices configured.</p>
            ) : (
              prices.map(p => (
                <div key={p.group_name} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-600 w-32">{p.group_name}</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={values[p.group_name] ?? p.price_inc_gst}
                      onChange={e => setValues(prev => ({ ...prev, [p.group_name]: Number(e.target.value) }))}
                      aria-label={`Price for ${p.group_name}`}
                      className="w-28 pl-6"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 shrink-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Prices'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// ── Danger zone: Delete Variant ────────────────────────────────────────────

export function VariantDangerZone({
  patternId,
  variantId,
  variantName,
}: {
  patternId: string
  variantId: string
  variantName: string
}) {
  const router = useRouter()
  const [showDel, setShowDel]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const token = await getAdminToken()
      const res = await fetch(`${API}/api/admin/products/${patternId}/variants/${variantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      toastSuccess('Variant deleted')
      router.push(`/admin/products/${patternId}`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete variant')
      setDeleting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setShowDel(true)}
      >
        Delete Variant
      </Button>

      <Dialog open={showDel} onOpenChange={o => { if (!o) setShowDel(false) }}>
        <DialogContent className="rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold text-zinc-900">Delete Variant</DialogTitle>
          <p className="text-sm text-zinc-600">
            Delete <strong>{variantName}</strong>? This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
