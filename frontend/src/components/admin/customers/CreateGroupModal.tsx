'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = { onClose: () => void }

export default function CreateGroupModal({ onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const name = (new FormData(e.currentTarget).get('name') as string).trim()
    if (!name) return setError('Group name is required')

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to create group')
      }
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Create Customer Group</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            {error && <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <label className="block text-sm font-medium text-zinc-700 mb-1">Group Name</label>
            <input
              name="name"
              autoFocus
              placeholder="e.g. Wholesale, Retail, VIP"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
