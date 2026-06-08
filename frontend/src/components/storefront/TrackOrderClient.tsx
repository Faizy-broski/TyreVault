'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { fetchGuestOrder, type GuestOrderResult } from '@/lib/query/customer-hooks'
import { createClient } from '@/lib/supabase/client'
import OrderStatusCard from './account/OrderStatusCard'

function inputCls() {
  return 'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
}

export default function TrackOrderClient() {
  const searchParams = useSearchParams()

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') ?? '')
  const [email,       setEmail]       = useState(searchParams.get('email') ?? '')
  const [result,      setResult]      = useState<GuestOrderResult | null>(null)
  const [notFound,    setNotFound]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [isSignedIn,  setIsSignedIn]  = useState(false)

  // Detect if user is signed in for the "view all orders" banner
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session)
    })
  }, [])

  // Auto-submit if both params are pre-filled from the checkout confirmation link
  useEffect(() => {
    const preOrder = searchParams.get('order')
    const preEmail = searchParams.get('email')
    if (preOrder && preEmail) {
      handleLookup(preOrder, preEmail)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLookup(on = orderNumber, em = email) {
    const trimOrder = on.trim()
    const trimEmail = em.trim()
    if (!trimOrder || !trimEmail) return
    setLoading(true)
    setResult(null)
    setNotFound(false)
    setError(null)
    try {
      const data = await fetchGuestOrder(trimOrder, trimEmail)
      if (data === null) {
        setNotFound(true)
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    handleLookup()
  }

  return (
    <div className="space-y-6">
      {isSignedIn && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-zinc-700">
          You&apos;re signed in.{' '}
          <Link href="/account/orders" className="font-semibold text-primary hover:underline">
            View all your orders →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Order Reference</label>
          <input
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            className={inputCls()}
            placeholder="TVT-20260607-1234"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls()}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
        <button
          type="submit"
          disabled={!orderNumber.trim() || !email.trim() || loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4" />
          {loading ? 'Looking up…' : 'Track Order'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {notFound && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center space-y-1">
          <p className="text-sm font-medium text-zinc-700">Order not found</p>
          <p className="text-xs text-zinc-500">Double-check your order reference and email address.</p>
        </div>
      )}

      {result && <OrderStatusCard order={result} />}
    </div>
  )
}
