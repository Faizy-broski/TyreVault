'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  patternId: string
  isPublished: boolean
  onSuccess?: () => void
}

export default function PublishToggle({ patternId, isPublished, onSuccess }: Props) {
  const [published, setPublished] = useState(isPublished)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const next = !published
    setPublished(next)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/admin/products/${patternId}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ publish: next }),
        }
      )
      if (!res.ok) throw new Error('Failed')
      startTransition(() => onSuccess?.())
    } catch {
      setPublished(!next)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-900">Status</h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          published ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${published ? 'bg-green-500' : 'bg-zinc-400'}`} />
          {published ? 'Published' : 'Draft'}
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-3">
        {published
          ? 'This product is visible on the website.'
          : 'This product is hidden from the website.'}
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          published
            ? 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            : 'bg-primary text-zinc-900 hover:bg-primary/90'
        }`}
      >
        {isPending ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
      </button>
    </div>
  )
}
