'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PatternForm, { EMPTY_PATTERN_FORM } from '@/components/admin/brands/PatternForm'
import type { Brand } from '@/types/admin.types'
import { toastError } from '@/lib/toast'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function NewPatternPage() {
  const { id } = useParams<{ id: string }>()
  const [brandName, setBrandName] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const res = await fetch(`${API}/api/admin/products/brands/all`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        })
        if (!res.ok) return
        const brands: Brand[] = await res.json()
        const b = brands.find(x => x.brand_id === id)
        if (b) setBrandName(b.brand_name)
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load brand')
      }
    }
    load()
  }, [id])

  return <PatternForm brandId={id} brandName={brandName} initial={EMPTY_PATTERN_FORM} />
}
