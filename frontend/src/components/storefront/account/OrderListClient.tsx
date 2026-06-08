'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCustomerOrders, type CustomerOrderSummary } from '@/lib/query/customer-hooks'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Package } from 'lucide-react'

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'fulfilled':
    case 'delivered':
    case 'paid':      return 'default'
    case 'cancelled': return 'destructive'
    default:          return 'secondary'
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function OrderRow({ order }: { order: CustomerOrderSummary }) {
  const date = new Date(order.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return (
    <Link
      href={`/account/orders/${order.order_id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <Package className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-zinc-900">{order.order_number}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{date} · {order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col items-end gap-1">
          <Badge variant={statusBadgeVariant(order.order_status)} className="text-xs">
            {statusLabel(order.order_status)}
          </Badge>
          <span className="text-xs text-zinc-500">A${Number(order.total_amount).toFixed(2)}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </div>
    </Link>
  )
}

export default function OrderListClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const page         = Number(searchParams.get('page') ?? '1')

  const { data, isLoading, error } = useCustomerOrders(page)

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-900">My Orders</h1>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error.message}
        </div>
      )}

      {data && data.data.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center space-y-2">
          <Package className="h-10 w-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-medium text-zinc-500">No orders yet</p>
          <Link href="/tyres" className="text-sm text-primary hover:underline">Browse tyres →</Link>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="space-y-3">
            {data.data.map(order => <OrderRow key={order.order_id} order={order} />)}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-500">Page {page} of {totalPages}</span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
