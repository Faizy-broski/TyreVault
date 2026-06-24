'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Package, ChevronUp, ChevronDown, ChevronsUpDown, Pencil } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function LoadIndexCell({ values }: { values: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const preview = values.slice(0, 4)
  const rest = values.slice(4)
  return (
    <span className="text-xs text-zinc-700">
      {(expanded ? values : preview).join(' · ')}
      {rest.length > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-1 text-primary hover:underline font-medium"
        >
          +{rest.length}
        </button>
      )}
      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="ml-1 text-zinc-400 hover:underline"
        >
          less
        </button>
      )}
    </span>
  )
}

type Product = {
  id: string
  name: string
  image: string | null
  brand: string
  brandId: string
  collection: string | null
  variantCount: number
  activeVariants: number
  totalStock: number
  loadIndexes: string[]
  firstSku: string | null
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

// ── Inline bool toggle (Yes / No) ─────────────────────────────────────────

function BoolToggle({ productId, initial, field }: {
  productId: string
  initial: boolean
  field: 'publish' | 'active'
}) {
  const [value, setValue] = useState(initial)
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()

  async function set(next: boolean) {
    if (next === value || busy) return
    setValue(next)
    setBusy(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${API}/api/admin/products/${productId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify(field === 'publish' ? { publish: next } : { active: next }),
      })
      if (!res.ok) throw new Error('Failed')
      queryClient.invalidateQueries({ queryKey: ['admin', 'products', 'list'] })
    } catch {
      setValue(!next)
      toastError('Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`inline-flex rounded-lg border border-zinc-200 overflow-hidden text-xs font-semibold ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <button type="button" onClick={() => set(true)}
        className={`px-3 py-1 transition-colors ${value ? 'bg-green-500 text-white' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}>
        Yes
      </button>
      <button type="button" onClick={() => set(false)}
        className={`px-3 py-1 transition-colors border-l border-zinc-200 ${!value ? 'bg-red-500 text-white' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}>
        No
      </button>
    </div>
  )
}

// ── Row actions menu ───────────────────────────────────────────────────────

function ProductRowMenu({ product }: { product: Product }) {
  const queryClient = useQueryClient()
  const [showDel, setShowDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${API}/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      toastSuccess('Product deleted')
      setShowDel(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        <Link
          href={`/admin/products/${product.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm"
          onClick={e => e.stopPropagation()}
        >
          <Pencil className="w-3 h-3" /> Edit
        </Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowDel(true) }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors shadow-sm"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      <Dialog open={showDel} onOpenChange={o => { if (!o) setShowDel(false) }}>
        <DialogContent className="rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold text-zinc-900">Delete Product</DialogTitle>
          <p className="text-sm text-zinc-600">
            Delete <strong>{product.name}</strong>? This will remove all variants and cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="px-4 py-2 h-auto text-sm border-zinc-300 rounded-lg text-zinc-700 hover:bg-zinc-50">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 h-auto text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ── Sort header ────────────────────────────────────────────────────────────

function SortHead({ col, label, currentSort, currentOrder, onSort }: {
  col: string
  label: string
  currentSort: string
  currentOrder: 'asc' | 'desc'
  onSort: (col: string) => void
}) {
  const active = currentSort === col
  return (
    <TableHead
      onClick={() => onSort(col)}
      className="cursor-pointer select-none hover:text-primary/70 transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentOrder === 'asc'
            ? <ChevronUp className="w-3 h-3 text-foreground" />
            : <ChevronDown className="w-3 h-3 text-foreground" />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </TableHead>
  )
}

// ── Table ──────────────────────────────────────────────────────────────────

export default function ProductsTable({
  products,
  sortBy,
  sortOrder,
  onSort,
  selected,
  onSelect,
}: {
  products: Product[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (col: string) => void
  selected?: Set<string>
  onSelect?: (s: Set<string>) => void
}) {
  const displayed = (() => {
    // if (sortBy === 'variant_count') { ... } // VARIANTS DISABLED
    if (sortBy === 'brand_name') {
      return [...products].sort((a, b) =>
        sortOrder === 'asc' ? a.brand.localeCompare(b.brand) : b.brand.localeCompare(a.brand)
      )
    }
    return products
  })()
  if (products.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Package className="h-7 w-7 text-zinc-300" />
        </div>
        <p className="text-sm font-medium text-zinc-500">No products yet</p>
        <p className="mt-1 text-xs text-zinc-400">Get started by creating your first product.</p>
        <Link
          href="/admin/products/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create product
        </Link>
      </div>
    )
  }

  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b border-zinc-200 bg-primary/10 hover:bg-primary/10 odd:bg-primary/10 even:bg-primary/10">
          <TableHead className="w-10 px-5 py-3">
            {selected && onSelect && (
              <input
                type="checkbox"
                checked={displayed.length > 0 && selected.size === displayed.length}
                ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < displayed.length }}
                onChange={e => {
                  if (e.target.checked) onSelect(new Set(displayed.map(p => p.id)))
                  else onSelect(new Set())
                }}
                className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
              />
            )}
          </TableHead>
          <TableHead className="w-44">SKU</TableHead>
          <SortHead col="pattern_name" label="Name" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <SortHead col="brand_name" label="Brand" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <TableHead className="w-16 text-center">Sizes</TableHead>
          <TableHead className="w-36">Load Index</TableHead>
          <TableHead className="w-24">Stock</TableHead>
          <TableHead className="w-20">Active</TableHead>
          <SortHead col="show_on_website" label="Website" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <TableHead className="w-20 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-zinc-200">
        {displayed.map((p, i) => (
          <TableRow key={p.id} className={selected?.has(p.id) ? '!bg-amber-50/30' : ''}>
            <TableCell className="px-5 py-3">
              {selected && onSelect && (
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={e => {
                    const next = new Set(selected)
                    if (e.target.checked) next.add(p.id)
                    else next.delete(p.id)
                    onSelect(next)
                  }}
                  className="rounded border-zinc-300 text-primary focus:ring-primary h-4 w-4 transition-all"
                />
              )}
            </TableCell>
            <TableCell className="w-44">
              {p.firstSku
                ? <span className="text-xs font-mono font-medium text-zinc-700 whitespace-nowrap">{p.firstSku}</span>
                : <span className="text-xs text-zinc-400">—</span>
              }
            </TableCell>
            <TableCell>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-2.5 group">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="h-10 w-10 rounded-lg object-contain border border-zinc-200 bg-zinc-50 p-0.5 shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-100 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-zinc-300" />
                  </div>
                )}
                <span className="font-bold text-primary group-hover:underline">{p.name}</span>
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{p.brand}</TableCell>
            <TableCell className="w-16 text-center">
              {p.variantCount > 0
                ? <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{p.variantCount}</span>
                : <span className="text-xs text-zinc-400">—</span>
              }
            </TableCell>
            <TableCell className="w-36">
              {(p.loadIndexes ?? []).length > 0
                ? <LoadIndexCell values={p.loadIndexes} />
                : <span className="text-xs text-zinc-400">—</span>
              }
            </TableCell>
            <TableCell className="w-24">
              {p.totalStock > 0
                ? <span className="text-xs font-semibold text-green-700">{p.totalStock} units</span>
                : <span className="text-xs text-zinc-400">No stock</span>
              }
            </TableCell>
            <TableCell className="w-20">
              <BoolToggle productId={p.id} initial={p.isActive} field="active" />
            </TableCell>
            <TableCell>
              <BoolToggle productId={p.id} initial={p.showOnWebsite} field="publish" />
            </TableCell>
            <TableCell className="text-right">
              <ProductRowMenu product={p} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

