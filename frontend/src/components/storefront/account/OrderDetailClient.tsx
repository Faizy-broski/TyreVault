'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useCustomerOrderDetail } from '@/lib/query/customer-hooks'
import OrderStatusCard from './OrderStatusCard'

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useCustomerOrderDetail(orderId)

  return (
    <div className="space-y-4">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to orders
      </Link>

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

      {data && <OrderStatusCard order={data} />}
    </div>
  )
}
