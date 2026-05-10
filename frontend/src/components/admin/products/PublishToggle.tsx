'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  patternId: string
  isPublished: boolean
}

export default function PublishToggle({ patternId, isPublished }: Props) {
  const router = useRouter()
  const [published, setPublished] = useState(isPublished)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const next = !published
    setPublished(next)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/products/${patternId}/publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ publish: next }),
        }
      )
      if (!res.ok) throw new Error('Failed')
      startTransition(() => router.refresh())
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
        onClick={toggle}
        disabled={isPending}
        className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          published
            ? 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            : 'bg-zinc-900 text-white hover:bg-zinc-700'
        }`}
      >
        {isPending ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
      </button>
    </div>
  )
}
