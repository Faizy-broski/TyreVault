'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BrandForm, { EMPTY_BRAND_FORM, type BrandFormState } from '@/components/admin/brands/BrandForm'
import type { Brand } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function brandToForm(b: Brand): BrandFormState {
  return {
    brand_name:              b.brand_name              ?? '',
    brand_slug:              b.brand_slug              ?? '',
    brand_logo:              b.brand_logo              ?? '',
    brand_banner_image:      b.brand_banner_image      ?? '',
    brand_short_description: b.brand_short_description ?? '',
    brand_description:       b.brand_description       ?? '',
    country_of_brand:        b.country_of_brand        ?? '',
    manufacturer_name:       b.manufacturer_name       ?? '',
    brand_positioning:       b.brand_positioning       ?? '',
    warranty_info:           b.warranty_info           ?? '',
    seo_title:               b.seo_title               ?? '',
    seo_description:         b.seo_description         ?? '',
    is_active:               b.is_active,
    show_on_website:         b.show_on_website,
    channel_wholesale:       b.channel_wholesale,
    channel_retail:          b.channel_retail,
    channel_marketplaces:    b.channel_marketplaces,
  }
}

export default function EditBrandPage() {
  const { id } = useParams<{ id: string }>()
  const [initial, setInitial] = useState<BrandFormState | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const token = session?.access_token ?? ''
        const res = await fetch(`${API}/api/admin/products/brands`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to load brands')
        const brands: Brand[] = await res.json()
        const brand = brands.find(b => b.brand_id === id)
        if (!brand) throw new Error('Brand not found')
        setInitial(brandToForm(brand))
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load brand')
        setInitial(EMPTY_BRAND_FORM)
      }
    }
    load()
  }, [id])

  if (!initial) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />)}
      </div>
    )
  }

  return <BrandForm brandId={id} initial={initial} />
}
