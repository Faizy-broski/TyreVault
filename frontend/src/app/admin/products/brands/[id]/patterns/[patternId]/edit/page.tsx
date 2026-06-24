'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PatternForm, { EMPTY_PATTERN_FORM, type PatternFormState } from '@/components/admin/brands/PatternForm'
import type { Brand } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function patternToForm(p: any): PatternFormState {
  return {
    pattern_name:              p.pattern_name              ?? '',
    pattern_slug:              p.pattern_slug              ?? '',
    pattern_short_description: p.pattern_short_description ?? '',
    pattern_description:       p.pattern_description       ?? '',
    main_image:                p.main_image                ?? '',
    application_type:          p.application_type          ?? 'passenger',
    season_type:               p.season_type               ?? '',
    performance_category:      p.performance_category      ?? '',
    position_category:         p.position_category         ?? '',
    shoulder_type:             p.shoulder_type             ?? '',
    terrain_type:              p.terrain_type              ?? '',
    default_country_of_origin: p.default_country_of_origin ?? '',
    warranty_km:               p.warranty_km != null ? String(p.warranty_km) : '',
    seo_title:                 p.seo_title                 ?? '',
    seo_description:           p.seo_description           ?? '',
    tyre_overview:             p.tyre_overview             ?? '',
    features:                  p.features                  ?? '',
    warranty_information:      p.warranty_information       ?? '',
    is_active:                 p.is_active                 ?? true,
    show_on_website:           p.show_on_website           ?? true,
    on_sale:                   p.on_sale                   ?? false,
    discountable:              p.discountable              ?? true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category_ids:              (p.pattern_categories ?? []).map((pc: any) => pc.categories?.category_id ?? pc.category_id).filter(Boolean),
  }
}

export default function EditPatternPage() {
  const { id, patternId } = useParams<{ id: string; patternId: string }>()
  const [brandName, setBrandName] = useState('')
  const [initial, setInitial]     = useState<PatternFormState | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const token = session?.access_token ?? ''
        const headers = { Authorization: `Bearer ${token}` }

        const [brandsRes, patternRes] = await Promise.all([
          fetch(`${API}/api/admin/products/brands/all`, { headers }),
          fetch(`${API}/api/admin/products/brands/${id}/patterns/${patternId}`, { headers }),
        ])
        if (!brandsRes.ok || !patternRes.ok) throw new Error('Failed to load')

        const brands: Brand[] = await brandsRes.json()
        const b = brands.find(x => x.brand_id === id)
        if (b) setBrandName(b.brand_name)

        const pattern = await patternRes.json()
        setInitial(patternToForm(pattern))
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load pattern')
        setInitial(EMPTY_PATTERN_FORM)
      }
    }
    load()
  }, [id, patternId])

  if (!initial) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />)}
      </div>
    )
  }

  return <PatternForm brandId={id} brandName={brandName} patternId={patternId} initial={initial} />
}
