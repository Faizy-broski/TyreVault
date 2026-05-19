'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Plus, Trash2, Package, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Product = {
  id: string
  name: string
  brand: string
  brandId: string
  collection: string | null
  variantCount: number
  activeVariants: number
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

// ── Inline publish toggle ──────────────────────────────────────────────────

function InlinePublishToggle({ productId, initial, onToggled }: {
  productId: string
  initial: boolean
  onToggled: () => void
}) {
  const [published, setPublished] = useState(initial)
  const [busy, setBusy] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !published
    setPublished(next)
    setBusy(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(`${API}/api/admin/products/${productId}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ publish: next }),
      })
      if (!res.ok) throw new Error('Failed')
      toastSuccess(next ? 'Product published' : 'Product unpublished')
      onToggled()
    } catch {
      setPublished(!next)
      toastError(next ? 'Failed to publish product' : 'Failed to unpublish product')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={published ? 'Click to unpublish' : 'Click to publish'}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 h-auto text-xs font-medium transition-colors disabled:opacity-50 ${
        published
          ? 'bg-green-50 text-green-700 hover:bg-green-100'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${published ? 'bg-green-500' : 'bg-zinc-400'}`} />
      {published ? 'Published' : 'Draft'}
    </Button>
  )
}

// ── Row actions menu ───────────────────────────────────────────────────────

function ProductRowMenu({ product }: { product: Product }) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

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
      router.refresh()
      setShowDel(false)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div ref={ref} className="relative inline-block">
      
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Product actions"
          onClick={() => setOpen(o => !o)}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            <Link
              href={`/admin/products/${product.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              View details
            </Link>
            <Link
              href={`/admin/products/${product.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit product
            </Link>
            <Link
              href={`/admin/products/${product.id}/variants/new`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              Add variant
            </Link>
            <div className="border-t border-zinc-100 my-1" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); setShowDel(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 h-auto justify-start text-sm text-red-600 hover:bg-red-50 rounded-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete product
            </Button>
          </div>
        )}
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
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
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
      className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide cursor-pointer select-none hover:text-zinc-700 transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentOrder === 'asc'
            ? <ChevronUp className="w-3 h-3 text-zinc-700" />
            : <ChevronDown className="w-3 h-3 text-zinc-700" />
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
  onPublishToggle,
  sortBy,
  sortOrder,
  onSort,
}: {
  products: Product[]
  onPublishToggle: () => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSort: (col: string) => void
}) {
  const displayed = (() => {
    if (sortBy === 'variant_count') {
      return [...products].sort((a, b) =>
        sortOrder === 'asc' ? a.variantCount - b.variantCount : b.variantCount - a.variantCount
      )
    }
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
    <Table className="w-full text-sm min-w-160">
      <TableHeader>
        <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
          <SortHead col="pattern_name" label="Name"     currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <SortHead col="brand_name"   label="Brand"    currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <TableHead className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Collection</TableHead>
          <SortHead col="variant_count" label="Variants" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <SortHead col="show_on_website" label="Status" currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <SortHead col="updated_at"   label="Updated"  currentSort={sortBy} currentOrder={sortOrder} onSort={onSort} />
          <TableHead className="px-4 py-3 w-10"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-zinc-100">
        {displayed.map(p => (
          <TableRow key={p.id} className="even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150">
            <TableCell className="px-4 py-3">
              <Link href={`/admin/products/${p.id}`} className="font-medium text-primary hover:underline">
                {p.name}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-3 text-zinc-600">{p.brand}</TableCell>
            <TableCell className="px-4 py-3 text-zinc-500">{p.collection ?? '—'}</TableCell>
            <TableCell className="px-4 py-3">
              <span className="text-zinc-700 text-sm">{p.variantCount}</span>
              {p.activeVariants < p.variantCount && (
                <span className="ml-1 text-xs text-zinc-400">
                  ({p.activeVariants} active)
                </span>
              )}
            </TableCell>
            <TableCell className="px-4 py-3">
              <InlinePublishToggle
                productId={p.id}
                initial={p.showOnWebsite}
                onToggled={onPublishToggle}
              />
            </TableCell>
            <TableCell className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
              {relativeDate(p.updatedAt)}
            </TableCell>
            <TableCell className="px-4 py-3 text-right">
              <ProductRowMenu product={p} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
