import { Suspense } from 'react'
import OrderDetailClient from '@/components/storefront/account/OrderDetailClient'

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  return (
    <Suspense>
      <OrderDetailClient orderId={orderId} />
    </Suspense>
  )
}
