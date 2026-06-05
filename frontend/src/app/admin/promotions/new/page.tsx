'use client'

import { useEffect } from 'react'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import PromotionForm from '@/components/admin/promotions/PromotionForm'

export default function NewPromotionPage() {
  useEffect(() => { document.title = 'New Promotion | Admin' }, [])

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-5">
        <AdminBreadcrumb crumbs={[{ label: 'Promotions', href: '/admin/promotions' }, { label: 'New' }]} />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">New Promotion</h1>
      <PromotionForm mode="create" />
    </div>
  )
}

