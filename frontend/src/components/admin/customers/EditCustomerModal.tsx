'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CustomerListItem } from '@/types/admin.types'

type Props = {
  customer: CustomerListItem
  onClose: () => void
}

export default function EditCustomerModal({ customer, onClose }: Props) {
  const router     = useRouter()
  const dialogRef  = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${customer.customer_id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email:     fd.get('email'),
            firstName: fd.get('firstName'),
            lastName:  fd.get('lastName'),
            company:   fd.get('company'),
            phone:     fd.get('phone'),
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Update failed')
      }
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Edit Customer</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">esc</span>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {[
              { name: 'email',     label: 'Email',      type: 'email',  defaultValue: customer.email,      required: true },
              { name: 'firstName', label: 'First Name', type: 'text',   defaultValue: customer.first_name ?? '' },
              { name: 'lastName',  label: 'Last Name',  type: 'text',   defaultValue: customer.last_name  ?? '' },
              { name: 'company',   label: 'Company',    type: 'text',   defaultValue: customer.company    ?? '' },
              { name: 'phone',     label: 'Phone',      type: 'tel',    defaultValue: customer.phone      ?? '' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{field.label}</label>
                <input
                  name={field.name}
                  type={field.type}
                  defaultValue={field.defaultValue}
                  required={field.required}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50">
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
