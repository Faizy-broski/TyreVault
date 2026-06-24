'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import PromotionForm, { type PromotionFormValues } from '@/components/admin/promotions/PromotionForm'
import { createClient } from '@/lib/supabase/client'
import { toastError } from '@/lib/toast'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function EditPromotionPage() {
  const { id } = useParams<{ id: string }>()
  const [initialValues, setInitialValues] = useState<Partial<PromotionFormValues> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'Edit Promotion | Admin' }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const res = await fetch(`${API}/api/admin/promotions/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) throw new Error(`Failed to load promotion (${res.status})`)
        const p = await res.json()
        if (!cancelled) {
          setInitialValues({
            title:            p.title            ?? '',
            brand_name:       p.brand_name       ?? '',
            description:      p.description      ?? '',
            cta_url:          p.cta_url          ?? '',
            discount_type:    p.discount_type    ?? 'percent',
            discount_value:   String(p.discount_value ?? 0),
            start_date:       p.start_date       ?? '',
            end_date:         p.end_date         ?? '',
            applies_to:       p.applies_to       ?? 'brand',
            target_id:        p.target_id        ?? '',
            minimum_qty:      String(p.minimum_qty  ?? 1),
            display_order:    String(p.display_order ?? 0),
            show_on_homepage: p.show_on_homepage ?? false,
            is_active:        p.is_active        ?? true,
            image_url:        p.image_url        ?? '',
          })
        }
      } catch (err) {
        if (!cancelled) toastError(err instanceof Error ? err.message : 'Failed to load promotion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="mb-5">
        <AdminBreadcrumb crumbs={[{ label: 'Promotions', href: '/admin/promotions' }, { label: 'Edit' }]} />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 mb-6">Edit Promotion</h1>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : initialValues ? (
        <PromotionForm mode="edit" promotionId={id} initialValues={initialValues} />
      ) : (
        <p className="text-sm text-zinc-400">Promotion not found.</p>
      )}
    </div>
  )
}
