import type { Metadata } from 'next'
import CustomersClient from './CustomersClient'

export const metadata: Metadata = { title: 'Customers — Admin' }

export default function CustomersPage() {
  return <CustomersClient />
}
