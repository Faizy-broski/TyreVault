'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type Product = {
  id: string
  name: string
  brand: string
  collection: string | null
  variantCount: number
  activeVariants: number
  isActive: boolean
  showOnWebsite: boolean
  updatedAt: string
  createdAt: string
}

function ProductRowMenu({ product }: { product: Product }) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [showDel, setShowDel]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState('')
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
    setDelError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      router.refresh()
      setShowDel(false)
    } catch (err: unknown) {
      setDelError(err instanceof Error ? err.message : 'Failed to delete')
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
          className="text-zinc-400 hover:text-zinc-700"
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
              View / Edit
            </Link>
            <Link
              href={`/admin/products/${product.id}/variants/new`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              Add Variant
            </Link>
            <div className="border-t border-zinc-100 my-1" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setOpen(false); setShowDel(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 h-auto justify-start text-sm text-red-600 hover:bg-red-50 rounded-none"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Product
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDel} onOpenChange={o => { if (!o) setShowDel(false) }}>
        <DialogContent className="rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold text-zinc-900">Delete Product</DialogTitle>
          <p className="text-sm text-zinc-600">
            Delete <strong>{product.name}</strong>? This will also remove all variants and cannot be undone.
          </p>
          {delError && <p className="text-sm text-red-600">{delError}</p>}
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

export default function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-zinc-400">
        No products yet.{' '}
        <Link href="/admin/products/new" className="text-zinc-900 underline">Create your first product</Link>
      </div>
    )
  }

  return (
    <Table className="w-full text-sm min-w-140">
      <TableHeader>
        <TableRow className="border-b border-zinc-200 bg-zinc-50 hover:bg-zinc-50">
          <TableHead className="px-4 py-3 text-left font-medium text-zinc-500">Product</TableHead>
          <TableHead className="px-4 py-3 text-left font-medium text-zinc-500">Brand</TableHead>
          <TableHead className="px-4 py-3 text-left font-medium text-zinc-500">Collection</TableHead>
          <TableHead className="px-4 py-3 text-left font-medium text-zinc-500">Variants</TableHead>
          <TableHead className="px-4 py-3 text-left font-medium text-zinc-500">Status</TableHead>
          <TableHead className="px-4 py-3 w-10"><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-zinc-100">
        {products.map(p => (
          <TableRow key={p.id} className="hover:bg-zinc-50 transition-colors">
            <TableCell className="px-4 py-3">
              <Link href={`/admin/products/${p.id}`} className="font-medium text-primary hover:underline">
                {p.name}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-3 text-zinc-600">{p.brand}</TableCell>
            <TableCell className="px-4 py-3 text-zinc-500">{p.collection ?? '—'}</TableCell>
            <TableCell className="px-4 py-3">
              <Badge className="h-auto rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 border-0">
                {p.variantCount} variant{p.variantCount !== 1 ? 's' : ''}
              </Badge>
            </TableCell>
            <TableCell className="px-4 py-3">
              {p.showOnWebsite ? (
                <Badge className="h-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                </Badge>
              ) : (
                <Badge className="h-auto inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />Inactive
                </Badge>
              )}
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
