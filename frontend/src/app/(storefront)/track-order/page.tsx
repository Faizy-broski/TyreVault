import { Suspense } from 'react'
import TrackOrderClient from '@/components/storefront/TrackOrderClient'

export default function TrackOrderPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-900">Track Your Order</h1>
        <p className="text-sm text-zinc-500">Enter your order reference and email to check the status.</p>
      </div>
      <Suspense>
        <TrackOrderClient />
      </Suspense>
    </div>
  )
}
