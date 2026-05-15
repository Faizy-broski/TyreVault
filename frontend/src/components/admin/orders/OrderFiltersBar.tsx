'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PAYMENT_OPTS = [
  { value: 'paid',           label: 'Paid' },
  { value: 'unpaid',         label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'refunded',       label: 'Refunded' },
]
const FULFILLMENT_OPTS = [
  { value: 'pending',    label: 'Pending' },
  { value: 'paid',       label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'fulfilled',  label: 'Fulfilled' },
  { value: 'cancelled',  label: 'Cancelled' },
  { value: 'refunded',   label: 'Refunded' },
]

interface Props {
  search:            string
  paymentStatus:     string
  fulfillmentStatus: string
}

export default function OrderFiltersBar({ search, paymentStatus, fulfillmentStatus }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<'payment' | 'fulfillment' | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    const merged: Record<string, string> = { page: '1' }
    if (search)            merged.search            = search
    if (paymentStatus)     merged.paymentStatus     = paymentStatus
    if (fulfillmentStatus) merged.fulfillmentStatus = fulfillmentStatus
    Object.assign(merged, overrides)
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    return `/admin/orders?${p}`
  }

  function pick(key: string, val: string) {
    router.push(buildHref({ [key]: val }))
    setOpen(null)
  }

  const activePayment     = PAYMENT_OPTS.find(o => o.value === paymentStatus)
  const activeFulfillment = FULFILLMENT_OPTS.find(o => o.value === fulfillmentStatus)

  return (
    <div ref={ref} className="flex items-center gap-2">
      {/* Payment filter */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'payment' ? null : 'payment')}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
            activePayment
              ? 'border-primary bg-primary text-zinc-900'
              : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
          }`}
        >
          {!activePayment && <span className="text-zinc-400">+</span>}
          Payment{activePayment && ` · ${activePayment.label}`}
          {activePayment && (
            <span
              className="ml-0.5 leading-none hover:opacity-70"
              onClick={e => { e.stopPropagation(); pick('paymentStatus', '') }}
            >×</span>
          )}
        </button>
        {open === 'payment' && (
          <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            {PAYMENT_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => pick('paymentStatus', paymentStatus === opt.value ? '' : opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-50 transition-colors ${
                  paymentStatus === opt.value ? 'font-semibold text-zinc-900' : 'text-zinc-700'
                }`}
              >
                {opt.label}
                {paymentStatus === opt.value && (
                  <svg className="w-3.5 h-3.5 text-zinc-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fulfillment filter */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'fulfillment' ? null : 'fulfillment')}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
            activeFulfillment
              ? 'border-primary bg-primary text-zinc-900'
              : 'border-zinc-300 text-zinc-600 hover:border-zinc-500'
          }`}
        >
          {!activeFulfillment && <span className="text-zinc-400">+</span>}
          Fulfilment{activeFulfillment && ` · ${activeFulfillment.label}`}
          {activeFulfillment && (
            <span
              className="ml-0.5 leading-none hover:opacity-70"
              onClick={e => { e.stopPropagation(); pick('fulfillmentStatus', '') }}
            >×</span>
          )}
        </button>
        {open === 'fulfillment' && (
          <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            {FULFILLMENT_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => pick('fulfillmentStatus', fulfillmentStatus === opt.value ? '' : opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-50 transition-colors ${
                  fulfillmentStatus === opt.value ? 'font-semibold text-zinc-900' : 'text-zinc-700'
                }`}
              >
                {opt.label}
                {fulfillmentStatus === opt.value && (
                  <svg className="w-3.5 h-3.5 text-zinc-900" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
