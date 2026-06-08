import { Suspense } from 'react'
import OrderListClient from '@/components/storefront/account/OrderListClient'

export default function AccountOrdersPage() {
  return (
    <Suspense>
      <OrderListClient />
    </Suspense>
  )
}
