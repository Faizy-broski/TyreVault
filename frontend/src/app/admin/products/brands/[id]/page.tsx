'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Badge } from '@/components/ui/badge'
import { toastError } from '@/lib/toast'
import { Pencil } from 'lucide-react'
import type { Brand } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const POSITIONING_COLOURS: Record<string, string> = {
  budget:     'bg-zinc-100 text-zinc-600',
  mid_range:  'bg-blue-50 text-blue-700',
  premium:    'bg-amber-50 text-amber-700',
  commercial: 'bg-purple-50 text-purple-700',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-zinc-800 whitespace-pre-line">{value}</p>
    </div>
  )
}

function Flag({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
      <span className="text-sm text-zinc-700">{label}</span>
      <Badge className={`text-xs rounded-full border-0 ${active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
        {active ? 'Yes' : 'No'}
      </Badge>
    </div>
  )
}

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [brand, setBrand]     = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        const res = await fetch(`${API}/api/admin/products/brands`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) throw new Error('Failed to load brands')
        const brands: Brand[] = await res.json()
        const b = brands.find(x => x.brand_id === id)
        if (!b) throw new Error('Brand not found')
        setBrand(b)
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load brand')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />)}
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl">
        <p className="text-sm text-zinc-500">Brand not found.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-6">
      <AdminBreadcrumb crumbs={[
        { label: 'Products', href: '/admin/products' },
        { label: 'Brands',   href: '/admin/products/brands' },
        { label: brand.brand_name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {brand.brand_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.brand_logo} alt="" className="h-16 w-16 object-contain rounded-xl border border-zinc-200 bg-zinc-50 p-1 shrink-0" />
          ) : (
            <div className="h-16 w-16 rounded-xl border border-zinc-200 bg-zinc-100 flex items-center justify-center text-zinc-400 text-lg font-bold shrink-0">
              {brand.brand_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{brand.brand_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-400 font-mono">/{brand.brand_slug}</span>
              {brand.brand_positioning && (
                <Badge className={`text-xs rounded-full border-0 capitalize ${POSITIONING_COLOURS[brand.brand_positioning] ?? 'bg-zinc-100 text-zinc-600'}`}>
                  {brand.brand_positioning.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link
          href={`/admin/products/brands/${id}/edit`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm shrink-0"
        >
          <Pencil className="w-4 h-4" /> Edit Brand
        </Link>
      </div>

      {/* Banner */}
      {brand.brand_banner_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.brand_banner_image} alt="Banner" className="w-full h-40 object-cover rounded-2xl border border-zinc-200" />
      )}

      {/* General */}
      <Section title="General">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Country of Brand"   value={brand.country_of_brand} />
          <Field label="Manufacturer"       value={brand.manufacturer_name} />
          <Field label="Short Description"  value={brand.brand_short_description} />
        </div>
        {brand.brand_description && (
          <div className="mt-5">
            <Field label="Full Description" value={brand.brand_description} />
          </div>
        )}
        {brand.warranty_info && (
          <div className="mt-5">
            <Field label="Warranty Information" value={brand.warranty_info} />
          </div>
        )}
      </Section>

      {/* SEO */}
      {(brand.seo_title || brand.seo_description) && (
        <Section title="SEO">
          <div className="space-y-4">
            <Field label="SEO Title"       value={brand.seo_title} />
            <Field label="SEO Description" value={brand.seo_description} />
          </div>
        </Section>
      )}

      {/* Visibility */}
      <Section title="Visibility">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Flag label="Is Active"       active={brand.is_active} />
          <Flag label="Show on Website" active={brand.show_on_website} />
        </div>
      </Section>

      {/* Channel Permissions */}
      <Section title="Channel Permissions">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Flag label="Wholesale"    active={brand.channel_wholesale} />
          <Flag label="Retail"       active={brand.channel_retail} />
          <Flag label="Marketplaces" active={brand.channel_marketplaces} />
        </div>
      </Section>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/products/patterns?brand=${id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
        >
          View Patterns →
        </Link>
        <Link
          href={`/admin/products/brands/${id}/patterns/new`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
        >
          + New Pattern
        </Link>
      </div>
    </div>
  )
}
