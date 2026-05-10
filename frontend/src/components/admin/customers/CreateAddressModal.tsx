'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  customerId: string
  onClose: () => void
}

export default function CreateAddressModal({ customerId, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${customerId}/addresses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            addressName:  fd.get('addressName'),
            addressLine1: fd.get('addressLine1'),
            addressLine2: fd.get('addressLine2') || undefined,
            postalCode:   fd.get('postalCode')   || undefined,
            city:         fd.get('city')         || undefined,
            country:      fd.get('country')      || undefined,
            state:        fd.get('state')        || undefined,
            company:      fd.get('company')      || undefined,
            phone:        fd.get('phone')        || undefined,
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to create address')
      }
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Create Address</h2>
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

            {/* Address name — full width, required */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Address name <span className="text-red-500">*</span>
              </label>
              <input
                name="addressName"
                required
                placeholder="Home, Office, Warehouse…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
              />
            </div>

            {/* Address + Apartment — 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  name="addressLine1"
                  required
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  <span className="text-zinc-500">Apartment, suite, etc.</span>{' '}
                  <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="addressLine2"
                  placeholder="Apt 4B"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Postal Code + City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Postal Code <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="postalCode"
                  placeholder="2000"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  City <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="city"
                  placeholder="Sydney"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Country + State */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Country</label>
                <input
                  name="country"
                  placeholder="Australia"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  State <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="state"
                  placeholder="NSW"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
            </div>

            {/* Company + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Company <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="company"
                  placeholder="Acme Pty Ltd"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Phone <span className="text-xs text-zinc-400">(Optional)</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+61 400 000 000"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500"
                />
              </div>
            </div>
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
