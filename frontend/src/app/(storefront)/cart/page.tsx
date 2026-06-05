'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X, ShoppingCart, Wrench, ChevronRight, Trash2 } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'
import FitterSelectionModal from '@/components/storefront/FitterSelectionModal'

function isAbsoluteUrl(url: string) {
  return url.startsWith('https://') || url.startsWith('http://')
}

export default function CartPage() {
  const {
    items, qty, removeItem, updateQuantity,
    subtotal, itemCount, grandTotal,
    fittingSelection, setFittingSelection,
  } = useCartStore()

  const router = useRouter()
  const [fitterModalOpen, setFitterModalOpen] = useState(false)

  const count      = itemCount()
  const tyresTotal = subtotal()
  const total      = grandTotal()
  const tyreQty    = count

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-7 h-7 text-zinc-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Your cart is empty</h1>
        <p className="text-sm text-zinc-500 mb-6">Add tyres from the shop to get started.</p>
        <Link
          href="/tyres"
          className="inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors"
        >
          Browse Tyres
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">
        Cart <span className="text-zinc-400 font-normal text-lg">({count} {count === 1 ? 'item' : 'items'})</span>
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ── Items list ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">
          {items.map(item => {
            const itemQty = qty[item.id] ?? 0
            return (
              <div key={item.id}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 items-start"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 shrink-0 rounded-xl bg-zinc-100 relative overflow-hidden">
                  {item.image && isAbsoluteUrl(item.image) ? (
                    <Image src={item.image} alt={item.name} fill className="object-contain p-1.5" sizes="80px" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full border-2 border-zinc-300 opacity-40" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 truncate">{item.name}</p>
                  <p className="text-base font-bold text-zinc-900 truncate">{item.size}</p>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {item.price > 0 ? `A$${item.price.toFixed(2)} ea` : 'POA'}
                  </p>

                  {/* Qty stepper */}
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, itemQty - 1)}
                      className="w-7 h-7 rounded-lg border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-zinc-900">{itemQty}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, itemQty + 1)}
                      disabled={itemQty >= item.stock}
                      className="w-7 h-7 rounded-lg border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line total + remove */}
                <div className="flex flex-col items-end justify-between gap-4 shrink-0 self-stretch">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {item.price > 0 && (
                    <p className="text-base font-bold text-zinc-900">
                      A${(item.price * itemQty).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Order summary ───────────────────────────────────── */}
        <div className="w-full lg:w-80 lg:shrink-0 space-y-3">

          {/* Fitting partner section */}
          {fittingSelection ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Fitting Service</p>
                    <p className="text-sm font-semibold text-zinc-900 truncate">{fittingSelection.centreName}</p>
                    {fittingSelection.address && (
                      <p className="text-xs text-zinc-400 truncate">{fittingSelection.address}</p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-zinc-900 shrink-0">
                  A${fittingSelection.totalFittingCost.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFitterModalOpen(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Change partner
                </button>
                <span className="text-zinc-200">|</span>
                <button
                  type="button"
                  onClick={() => setFittingSelection(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            /* "Add fitting" button */
            <button
              type="button"
              onClick={() => setFitterModalOpen(true)}
              className="w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-zinc-200 hover:border-primary hover:bg-primary/5 px-4 py-4 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                  <Wrench className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-800 group-hover:text-zinc-900">Need your tyres fitted?</p>
                  <p className="text-xs text-zinc-400">Find a local fitting partner</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
            </button>
          )}

          {/* Totals */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Subtotal ({count} {count === 1 ? 'tyre' : 'tyres'})</span>
              <span>A${tyresTotal.toFixed(2)}</span>
            </div>
            {fittingSelection && (
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Fitting</span>
                <span>A${fittingSelection.totalFittingCost.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-zinc-400 border-t border-zinc-100 pt-2">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-100 pt-2">
              <span>Total</span>
              <span>A${total.toFixed(2)}</span>
            </div>
          </div>

          {/* CTA buttons */}
          <button
            type="button"
            onClick={() => router.push('/checkout')}
            className="w-full rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors"
          >
            Proceed to Checkout
          </button>

          <Link
            href="/tyres"
            className="block w-full rounded-xl border border-zinc-300 py-3.5 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* Fitter selection modal */}
      <FitterSelectionModal
        open={fitterModalOpen}
        onClose={() => setFitterModalOpen(false)}
        tyreQty={tyreQty}
        cartSubtotal={tyresTotal}
      />
    </div>
  )
}
