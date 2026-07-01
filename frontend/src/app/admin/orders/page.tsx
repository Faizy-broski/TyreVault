import type { Metadata } from 'next'
import OrdersClient from './OrdersClient'

export const metadata: Metadata = { title: 'Orders — Admin' }

export default function OrdersPage() {
  return <OrdersClient />
}
