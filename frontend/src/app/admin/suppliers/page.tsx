import type { Metadata } from 'next'
import SuppliersClient from '@/components/admin/suppliers/SuppliersClient'

export const metadata: Metadata = { title: 'Suppliers — Admin' }

export default function AdminSuppliersPage() {
  return <SuppliersClient />
}
