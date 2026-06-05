'use client'

import { useState, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { usePromotionList, type PromotionRow } from '@/lib/query/hooks'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'
import { useQueryClient } from '@tanstack/react-query'
import { adminKeys } from '@/lib/query/keys'

const API   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 20

async function getToken() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token ?? ''
}

function promotionStatus(p: PromotionRow): { label: string; cls: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (!p.is_active)             return { label: 'Inactive',  cls: 'bg-zinc-100 text-zinc-500' }
  if (p.start_date > today)     return { label: 'Scheduled', cls: 'bg-blue-50 text-blue-600'  }
  if (p.end_date   < today)     return { label: 'Expired',   cls: 'bg-red-50 text-red-500'    }
  return                               { label: 'Active',    cls: 'bg-green-50 text-green-600' }
}

function discountLabel(p: PromotionRow): string {
  if (p.discount_type === 'percent')      return `${p.discount_value}% off`
  if (p.discount_type === 'fixed_amount') return `Rs. ${p.discount_value} off`
  return 'Bundle'
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminPromotionsPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const qc           = useQueryClient()

  const search = searchParams.get('search') ?? ''
  const page   = Number(searchParams.get('page') ?? 1)

  const listQuery  = usePromotionList({ page, search })
  const loading    = listQuery.isPending
  const promotions = listQuery.data?.data  ?? []
  const count      = listQuery.data?.total ?? 0
  const totalPages = Math.ceil(count / LIMIT)

  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const buildHref = useCallback((extra: Record<string, string>) => {
    const p = new URLSearchParams({ search, page: String(page) })
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    return `${pathname}?${p}`
  }, [search, page, pathname])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/promotions/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok}` },
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      toastSuccess('Promotion deleted')
      qc.invalidateQueries({ queryKey: adminKeys.promotionList({}) })
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  async function handleToggleHomepage(p: PromotionRow) {
    setToggling(p.promotion_id)
    try {
      const tok = await getToken()
      const res = await fetch(`${API}/api/admin/promotions/${p.promotion_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_on_homepage: !p.show_on_homepage }),
      })
      if (!res.ok) throw new Error(`Update failed (${res.status})`)
      qc.invalidateQueries({ queryKey: adminKeys.promotionList({}) })
      router.refresh()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5">
        <AdminBreadcrumb crumbs={[{ label: 'Promotions' }]} />
      </div>

      <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Promotions</h1>
        <Link
          href="/admin/promotions/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Promotion
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-zinc-200">
          <form onSubmit={e => {
            e.preventDefault()
            const q = (new FormData(e.currentTarget).get('search') as string) ?? ''
            router.push(buildHref({ search: q, page: '1' }))
          }} className="relative w-full max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" name="search" defaultValue={search} placeholder="Search promotions…"
              className="pl-8 pr-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-full" />
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                {['', 'Title', 'Discount', 'Period', 'Status', 'Homepage', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i}>
                    {[12, 48, 20, 28, 16, 12, 16].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className={`h-4 w-${w} bg-zinc-100 rounded animate-pulse`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                    {search ? `No promotions matching "${search}"` : 'No promotions yet. Create one to get started.'}
                  </td>
                </tr>
              ) : promotions.map(p => {
                const status = promotionStatus(p)
                const busy   = deleting === p.promotion_id || toggling === p.promotion_id
                return (
                  <tr key={p.promotion_id} className={`odd:bg-background even:bg-muted/30 hover:bg-muted/60 transition-colors ${busy ? 'opacity-60' : ''}`}>
                    {/* Thumbnail */}
                    <td className="pl-4 pr-2 py-3">
                      <div className="relative h-11 w-9 overflow-hidden rounded-lg bg-zinc-100 flex-shrink-0">
                        {p.image_url && p.image_url.startsWith('http') ? (
                          <Image src={p.image_url} alt={p.title} fill className="object-cover" sizes="36px" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                        )}
                      </div>
                    </td>

                    {/* Title + brand */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-medium text-zinc-900 truncate">{p.title}</p>
                      {p.brand_name && (
                        <p className="text-xs text-zinc-400 mt-0.5">{p.brand_name}</p>
                      )}
                    </td>

                    {/* Discount */}
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-700">{discountLabel(p)}</td>

                    {/* Period */}
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-500 text-xs">
                      {formatDate(p.start_date)}<br />{formatDate(p.end_date)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>

                    {/* Homepage toggle */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleHomepage(p)}
                        aria-label={p.show_on_homepage ? 'Remove from homepage' : 'Show on homepage'}
                        className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed ${p.show_on_homepage ? 'bg-primary' : 'bg-zinc-300'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${p.show_on_homepage ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/promotions/${p.promotion_id}/edit`}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete(p.promotion_id, p.title)}
                          className="rounded-md px-2.5 py-1 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deleting === p.promotion_id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-2 px-4 py-3 border-t border-zinc-200 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          {loading
            ? <div className="h-4 w-36 bg-zinc-100 rounded animate-pulse" />
            : <span>{count === 0 ? '0 results' : `${(page - 1) * LIMIT + 1}–${Math.min(page * LIMIT, count)} of ${count}`}</span>
          }
          <div className="flex items-center gap-3">
            <span>{loading ? '…' : `Page ${page} of ${totalPages || 1}`}</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Prev</Link>
              )}
              {page < totalPages && (
                <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-white hover:border-zinc-400 transition-colors text-xs font-medium">Next</Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

