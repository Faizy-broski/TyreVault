'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// import { loadStripe } from '@stripe/stripe-js'
// import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { ChevronRight, ChevronLeft, MapPin, Wrench, CheckCircle, Car } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'

// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Address {
  line1:    string
  line2:    string
  suburb:   string
  state:    string
  postcode: string
}

interface CustomerInfo {
  email:      string
  first_name: string
  last_name:  string
}

// ── Step bar ──────────────────────────────────────────────────────────────────

const STEPS = ['Shipping', 'Fitter', 'Payment', 'Confirmation']

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
            i < current   ? 'bg-primary border-primary text-zinc-900'
            : i === current ? 'border-primary text-primary bg-white'
            : 'border-zinc-300 text-zinc-400 bg-white'
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

// ── Step 0: Shipping Address ──────────────────────────────────────────────────

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

// ── Step 1: Fitter (pre-populated from cart store) ───────────────────────────

function FitterStep({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const { fittingSelection, setFittingSelection } = useCartStore()
  const [showChangeModal, setShowChangeModal] = useState(false)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-zinc-400 hover:text-zinc-700">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-zinc-900">Fitting partner</h2>
      </div>

      {fittingSelection ? (
        /* ── Fitting already selected ── */
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">{fittingSelection.centreName}</p>
              {fittingSelection.address && (
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{fittingSelection.address}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-primary/20 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600">Fitting cost</span>
              <span className="font-semibold text-zinc-900">A${fittingSelection.totalFittingCost.toFixed(2)}</span>
            </div>
            {fittingSelection.wheelAlignment && (
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Incl. {fittingSelection.wheelAlignment.type === '2_wheel' ? '2-wheel' : fittingSelection.wheelAlignment.type === '4_wheel' ? '4-wheel' : ''} alignment</span>
                <span>A${fittingSelection.wheelAlignment.price.toFixed(2)}</span>
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-1">The fitter will contact you to arrange a fitting time.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowChangeModal(true)}
              className="text-xs text-primary hover:underline"
            >
              Change fitting partner
            </button>
            <span className="text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => setFittingSelection(null)}
              className="text-xs text-red-500 hover:underline"
            >
              Remove fitting
            </button>
          </div>
        </div>
      ) : (
        /* ── No fitting selected ── */
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-zinc-300 p-5 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto">
              <Wrench className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">No fitting partner selected</p>
              <p className="text-xs text-zinc-500 mt-0.5">Your tyres will be shipped to your address.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowChangeModal(true)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Add a fitting partner →
            </button>
          </div>
          <p className="text-xs text-zinc-400 text-center">You can skip fitting and have tyres delivered to your door.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors"
      >
        Continue to Payment
      </button>

      {/* Lazy-import modal to avoid loading Maps JS on every checkout visit */}
      {showChangeModal && (
        <FitterModalLazy
          open={showChangeModal}
          onClose={() => setShowChangeModal(false)}
        />
      )}
    </div>
  )
}

/** Lazy wrapper so @react-google-maps/api is only loaded when modal actually opens */
function FitterModalLazy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, qty, subtotal } = useCartStore()
  const tyreQty    = Object.values(qty).reduce((s, q) => s + q, 0)
  const cartSubtotal = subtotal()

  // Dynamically import to avoid Maps JS loading on checkout page itself
  const [Modal, setModal] = useState<React.ComponentType<{
    open: boolean; onClose: () => void; tyreQty: number; cartSubtotal: number
  }> | null>(null)

  useEffect(() => {
    import('@/components/storefront/FitterSelectionModal').then(m => setModal(() => m.default))
  }, [])

  if (!Modal) return null
  return <Modal open={open} onClose={onClose} tyreQty={tyreQty} cartSubtotal={cartSubtotal} />
}

// ── Step 2: Payment (TEST MODE — Stripe commented out) ───────────────────────

function PaymentForm({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // TODO: restore Stripe payment flow
    // const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    await new Promise(r => setTimeout(r, 600)) // simulate brief processing
    setLoading(false)
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

      {/* TEST MODE banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2">
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Test Mode</span>
        <span className="text-xs text-amber-600">— Stripe is disabled. Clicking Place Order will create a real order record.</span>
      </div>

      {/* Stripe PaymentElement commented out for testing */}
      {/* <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <PaymentElement />
      </Elements> */}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing…' : 'Place Order (Test)'}
      </button>
    </form>
  )
}

// ── Step 3: Confirmation ──────────────────────────────────────────────────────

function ConfirmationStep({ orderRef }: { orderRef: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center text-center space-y-4 py-8">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900">Order confirmed!</h2>
      <p className="text-sm text-zinc-500">
        Reference: <span className="font-mono font-semibold text-zinc-800">{orderRef}</span>
      </p>
      <p className="text-sm text-zinc-500 max-w-xs">
        You&apos;ll receive a confirmation email shortly. If you selected a fitting partner, they&apos;ll contact you to arrange a fitting time.
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

// ── Main checkout ─────────────────────────────────────────────────────────────

function CheckoutInner() {
  const { items, qty, subtotal, grandTotal, fittingSelection, clearCart } = useCartStore()
  const router = useRouter()

  const [step,           setStep]           = useState(0)
  const [address,        setAddress]        = useState<Address | null>(null)
  const [customer,       setCustomer]       = useState<CustomerInfo | null>(null)
  const [clientSecret,   setClientSecret]   = useState<string | null>(null)
  const [confirmedTotal, setConfirmedTotal] = useState<number>(0)
  const [orderRef,       setOrderRef]       = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [orderError,     setOrderError]     = useState<string | null>(null)
  const [mounted,        setMounted]        = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (items.length === 0 && step !== 3) router.push('/tyres')
  }, [items.length, step, router])

  async function handleAddressNext(addr: Address, cust: CustomerInfo) {
    setAddress(addr)
    setCustomer(cust)
    setStep(1)
  }

  async function handleFitterNext() {
    setOrderError(null)
    // Stripe disabled — skip payment-intent creation and go straight to payment step
    setConfirmedTotal(grandTotal())
    setClientSecret('test_mode')
    setStep(2)
  }

  async function handlePaymentSuccess() {
    if (!customer || !address) return
    setOrderError(null)

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
          fitment_centre_id:         fittingSelection?.centreId ?? null,
          wheel_alignment_type:      fittingSelection?.wheelAlignment?.type ?? null,
          stripe_payment_intent_id:  null,
          total_amount:              confirmedTotal > 0 ? confirmedTotal : grandTotal(),
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

  const orderLines = items.map(item => ({
    name:  item.name,
    size:  item.size,
    qty:   qty[item.id] ?? 0,
    price: item.price,
  }))

  const displayTotal = confirmedTotal > 0 ? confirmedTotal : grandTotal()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Checkout</h1>
      <StepBar current={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Steps */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6">
          {step === 0 && <AddressStep onNext={handleAddressNext} />}

          {step === 1 && (
            <FitterStep
              onNext={handleFitterNext}
              onBack={() => setStep(0)}
            />
          )}
          {step === 1 && paymentLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          )}
          {step === 1 && orderError && (
            <p className="mt-3 text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-2">{orderError}</p>
          )}

          {step === 2 && clientSecret && (
            <PaymentForm onSuccess={handlePaymentSuccess} onBack={() => setStep(1)} />
          )}
          {step === 2 && orderError && (
            <p className="mt-3 text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-4 py-2">{orderError}</p>
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
                  <span className="font-semibold text-zinc-900 shrink-0" suppressHydrationWarning>
                    {mounted ? (line.price > 0 ? `$${(line.price * line.qty).toFixed(2)}` : 'POA') : '—'}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-zinc-100 pt-3 space-y-1.5">
              {fittingSelection && (
                <>
                  <div className="flex justify-between text-sm text-zinc-600">
                    <span>Fitting ({fittingSelection.centreName})</span>
                    <span>A${fittingSelection.totalFittingCost.toFixed(2)}</span>
                  </div>
                  {fittingSelection.wheelAlignment && (
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Incl. wheel alignment</span>
                      <span>A${fittingSelection.wheelAlignment.price.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-1">
                <span>Total</span>
                <span suppressHydrationWarning>A${mounted ? displayTotal.toFixed(2) : '0.00'}</span>
              </div>
              <p className="text-xs text-zinc-400">Prices include GST · Shipping calculated separately</p>
            </div>

            {address && (
              <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-3 space-y-0.5">
                <p className="font-semibold text-zinc-700">Delivering to</p>
                <p>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p>
                <p>{address.suburb} {address.state} {address.postcode}</p>
              </div>
            )}

            {fittingSelection && (
              <div className="text-xs text-zinc-500 border-t border-zinc-100 pt-3 space-y-0.5">
                <p className="font-semibold text-zinc-700">Fitting service</p>
                <p>{fittingSelection.centreName}</p>
                {fittingSelection.address && <p>{fittingSelection.address}</p>}
                <p className="text-zinc-400">Fitter will contact you to arrange a time</p>
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
