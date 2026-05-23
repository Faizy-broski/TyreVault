'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { ChevronRight, ChevronLeft, MapPin, Clock, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Types ─────────────────────────────────────────────────────
interface Address {
  line1:      string
  line2:      string
  suburb:     string
  state:      string
  postcode:   string
}

interface CustomerInfo {
  email:      string
  first_name: string
  last_name:  string
}

interface FitmentCentre {
  fitment_centre_id:       string
  business_name:           string
  contact_phone:           string | null
  fitting_price:           number | null
  mobile_fitting_available: boolean
  opening_hours:           Record<string, { open: string; close: string; closed?: boolean }> | null
  addresses: { address_line1: string; suburb: string; state: string; postcode: string } | null
}

interface BookingSlot {
  date: string
  time: string
}

// ── Step indicators ────────────────────────────────────────────
const STEPS = ['Shipping', 'Fitter', 'Payment', 'Confirmation']

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
            i < current  ? 'bg-primary border-primary text-zinc-900'  :
            i === current ? 'border-primary text-primary bg-white'     :
            'border-zinc-300 text-zinc-400 bg-white'
          }`}>
            {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
          </div>
          <span className={`text-sm font-medium hidden sm:block ${i === current ? 'text-zinc-900' : 'text-zinc-400'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0" />}
        </li>
      ))}
    </ol>
  )
}

// ── Step 1: Shipping Address + Contact ────────────────────────
function AddressStep({ onNext }: { onNext: (addr: Address, customer: CustomerInfo) => void }) {
  const [addr, setAddr] = useState<Address>({ line1: '', line2: '', suburb: '', state: '', postcode: '' })
  const [cust, setCust] = useState<CustomerInfo>({ email: '', first_name: '', last_name: '' })

  const valid =
    addr.line1 && addr.suburb && addr.state && addr.postcode &&
    cust.email && cust.first_name && cust.last_name

  function addrField(key: keyof Address) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddr(f => ({ ...f, [key]: e.target.value }))
  }
  function custField(key: keyof CustomerInfo) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setCust(f => ({ ...f, [key]: e.target.value }))
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-zinc-900">Contact &amp; shipping</h2>
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">First name *</label>
            <input value={cust.first_name} onChange={custField('first_name')} placeholder="Jane"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Last name *</label>
            <input value={cust.last_name} onChange={custField('last_name')} placeholder="Smith"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Email *</label>
          <input type="email" value={cust.email} onChange={custField('email')} placeholder="jane@example.com"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Address line 1 *</label>
          <input value={addr.line1} onChange={addrField('line1')} placeholder="123 Main St"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Address line 2</label>
          <input value={addr.line2} onChange={addrField('line2')} placeholder="Unit / Apartment (optional)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Suburb *</label>
            <input value={addr.suburb} onChange={addrField('suburb')} placeholder="Suburb"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Postcode *</label>
            <input value={addr.postcode} onChange={addrField('postcode')} placeholder="4000" maxLength={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">State *</label>
          <select value={addr.state} onChange={addrField('state')}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white">
            <option value="">Select state</option>
            {['QLD','NSW','VIC','SA','WA','TAS','NT','ACT'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onNext(addr, cust)}
        disabled={!valid}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue to Fitter Selection
      </button>
    </div>
  )
}

// ── Step 2: Fitter Selection ───────────────────────────────────
function FitterStep({ onNext, onBack }: { onNext: (centre: FitmentCentre, slot: BookingSlot) => void; onBack: () => void }) {
  const [centres, setCentres] = useState<FitmentCentre[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FitmentCentre | null>(null)
  const [slot, setSlot] = useState<BookingSlot>({ date: '', time: '' })

  useEffect(() => {
    fetch(`${API}/api/stripe/fitment-centres`)
      .then(r => r.json())
      .then(data => { setCentres(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const canContinue = selected && slot.date && slot.time

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-zinc-400 hover:text-zinc-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900">Select a fitment centre</h2>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-100 animate-pulse" />)}
        </div>
      )}

      {!loading && centres.length === 0 && (
        <p className="text-sm text-zinc-500 py-8 text-center">No fitment centres available in your area.</p>
      )}

      {!loading && centres.length > 0 && (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {centres.map(c => (
            <button
              key={c.fitment_centre_id}
              type="button"
              onClick={() => setSelected(c)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                selected?.fitment_centre_id === c.fitment_centre_id
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900 text-sm">{c.business_name}</p>
                  {c.addresses && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {c.addresses.suburb}, {c.addresses.state} {c.addresses.postcode}
                    </p>
                  )}
                </div>
                {c.fitting_price != null && (
                  <span className="text-sm font-bold text-zinc-900 shrink-0">${c.fitting_price.toFixed(2)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-3 h-3" /> Book a time slot
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Date *</label>
              <input
                type="date"
                min={minDate}
                value={slot.date}
                onChange={e => setSlot(s => ({ ...s, date: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Time *</label>
              <select
                value={slot.time}
                onChange={e => setSlot(s => ({ ...s, time: e.target.value }))}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
              >
                <option value="">Select time</option>
                {times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => canContinue && onNext(selected!, slot)}
        disabled={!canContinue}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue to Payment
      </button>
    </div>
  )
}

// ── Step 3: Payment ────────────────────────────────────────────
function PaymentForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.')
      setLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-zinc-400 hover:text-zinc-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900">Payment</h2>
      </div>

      <div className="rounded-xl border border-zinc-200 p-4">
        <PaymentElement />
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  )
}

// ── Step 4: Confirmation ───────────────────────────────────────
function ConfirmationStep({ orderRef }: { orderRef: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center text-center space-y-4 py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900">Order confirmed!</h2>
      <p className="text-sm text-zinc-500">Reference: <span className="font-mono font-semibold text-zinc-800">{orderRef}</span></p>
      <p className="text-sm text-zinc-500 max-w-xs">
        You&apos;ll receive a confirmation email shortly with your order details and fitment booking.
      </p>
      <button
        type="button"
        onClick={() => router.push('/tyres')}
        className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors"
      >
        Continue Shopping
      </button>
    </div>
  )
}

// ── Main Checkout ──────────────────────────────────────────────
function CheckoutInner() {
  const { items, qty, subtotal, clearCart } = useCartStore()
  const router = useRouter()

  const [step,           setStep]           = useState(0)
  const [address,        setAddress]        = useState<Address | null>(null)
  const [customer,       setCustomer]       = useState<CustomerInfo | null>(null)
  const [centre,         setCentre]         = useState<FitmentCentre | null>(null)
  const [slot,           setSlot]           = useState<BookingSlot | null>(null)
  const [clientSecret,   setClientSecret]   = useState<string | null>(null)
  const [orderRef,       setOrderRef]       = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [orderError,     setOrderError]     = useState<string | null>(null)

  // Redirect to shop if cart is empty
  useEffect(() => {
    if (items.length === 0 && step !== 3) router.push('/tyres')
  }, [items.length, step, router])

  const totalCents = Math.round(subtotal() * 100)

  async function handleAddressNext(addr: Address, cust: CustomerInfo) {
    setAddress(addr)
    setCustomer(cust)
    setStep(1)
  }

  async function handleFitterNext(c: FitmentCentre, s: BookingSlot) {
    setCentre(c)
    setSlot(s)
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API}/api/stripe/payment-intent`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: totalCents }),
      })
      const data = await res.json()
      setClientSecret(data.clientSecret)
      setStep(2)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handlePaymentSuccess() {
    if (!customer || !address || !clientSecret) return
    setOrderError(null)

    // Extract payment intent ID from client secret (format: pi_xxx_secret_xxx)
    const stripePaymentIntentId = clientSecret.split('_secret_')[0]

    try {
      const res = await fetch(`${API}/api/orders`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customer,
          items: items.map(item => ({
            product_id: item.id,
            quantity:   qty[item.id] ?? 1,
            unit_price: item.price,
          })),
          shipping_address:          address,
          fitment_centre_id:         centre?.fitment_centre_id ?? null,
          booking_slot:              slot,
          stripe_payment_intent_id:  stripePaymentIntentId,
          total_amount:              subtotal(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setOrderError(body.error ?? 'Failed to record order. Please contact support.')
        return
      }

      const data = await res.json()
      setOrderRef(data.order_number ?? stripePaymentIntentId)
      clearCart()
      setStep(3)
    } catch {
      setOrderError('Network error. Please contact support with your payment reference.')
    }
  }

  // Order summary sidebar
  const orderLines = items.map(item => ({
    name:  item.name,
    size:  item.size,
    qty:   qty[item.id] ?? 0,
    price: item.price,
  }))

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Checkout</h1>
      <StepBar current={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Steps */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6">
          {step === 0 && <AddressStep onNext={(addr, cust) => handleAddressNext(addr, cust)} />}
          {orderError && step === 2 && (
            <p className="mt-3 text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-2">{orderError}</p>
          )}
          {step === 1 && (
            <FitterStep
              onNext={handleFitterNext}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
              <PaymentForm onSuccess={handlePaymentSuccess} onBack={() => setStep(1)} />
            </Elements>
          )}
          {step === 2 && paymentLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          {step === 3 && <ConfirmationStep orderRef={orderRef} />}
        </div>

        {/* Order summary */}
        {step < 3 && (
          <aside className="bg-white rounded-2xl border border-zinc-200 p-5 h-fit space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900">Order summary</h3>
            <ul className="space-y-3">
              {orderLines.map((line, i) => (
                <li key={i} className="flex justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800 truncate">{line.name}</p>
                    <p className="text-zinc-500 text-xs">{line.size} × {line.qty}</p>
                  </div>
                  <span className="font-semibold text-zinc-900 shrink-0">
                    {line.price > 0 ? `$${(line.price * line.qty).toFixed(2)}` : 'POA'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-zinc-100 pt-3 space-y-1">
              {centre?.fitting_price != null && (
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>Fitting ({centre.business_name})</span>
                  <span>${centre.fitting_price.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-1">
                <span>Total</span>
                <span>${(totalCents / 100).toFixed(2)}</span>
              </div>
              <p className="text-xs text-zinc-400">Prices include GST</p>
            </div>
            {address && (
              <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-3 space-y-0.5">
                <p className="font-semibold text-zinc-700">Delivering to</p>
                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                <p>{address.suburb} {address.state} {address.postcode}</p>
              </div>
            )}
            {slot && centre && (
              <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-3 space-y-0.5">
                <p className="font-semibold text-zinc-700">Fitment booking</p>
                <p>{centre.business_name}</p>
                <p>{slot.date} at {slot.time}</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return <CheckoutInner />
}
