'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingCart, Wrench, ChevronRight } from 'lucide-react'
import { useCartStore } from '@/stores/cart.store'
import FitterSelectionModal from './FitterSelectionModal'

function isAbsoluteUrl(url: string) {
  return url.startsWith('https://') || url.startsWith('http://')
}

export default function CartDrawer() {
  const {
    items, qty, isOpen, closeCart,
    removeItem, updateQuantity,
    subtotal, itemCount, grandTotal,
    fittingSelection, setFittingSelection,
  } = useCartStore()

  const [fitterModalOpen, setFitterModalOpen] = useState(false)

  if (!isOpen) return null

  const count      = itemCount()
  const tyresTotal = subtotal()
  const total      = grandTotal()
  const tyreQty    = count  // all items are tyres

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={closeCart} aria-hidden />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-zinc-700" />
            <span className="font-semibold text-zinc-900">Cart</span>
            {count > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-zinc-900">{count}</span>
            )}
          </div>
          <button type="button" onClick={closeCart}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700">Your cart is empty</p>
              <p className="text-xs text-zinc-400">Add tyres from the shop to get started</p>
              <button type="button" onClick={closeCart}>
                <Link href="/tyres" className="text-sm font-medium text-primary underline underline-offset-2">
                  Browse tyres
                </Link>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 px-5">
              {items.map(item => {
                const itemQty = qty[item.id] ?? 0
                return (
                  <li key={item.id} className="flex gap-3 py-4">
                    {/* Image */}
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-zinc-100 relative overflow-hidden">
                      {item.image && isAbsoluteUrl(item.image) ? (
                        <Image src={item.image} alt={item.name} fill className="object-contain p-1" sizes="64px" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border-2 border-zinc-300 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-500 truncate">{item.name}</p>
                      <p className="text-sm font-semibold text-zinc-900 truncate">{item.size}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {item.price > 0 ? `$${item.price.toFixed(2)} ea` : 'POA'}
                      </p>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, itemQty - 1)}
                          className="w-6 h-6 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium text-zinc-900">{itemQty}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, itemQty + 1)}
                          disabled={itemQty >= item.stock}
                          className="w-6 h-6 rounded border border-zinc-300 flex items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Line total + remove */}
                    <div className="flex flex-col items-end justify-between shrink-0">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-300 hover:text-zinc-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {item.price > 0 && (
                        <p className="text-sm font-semibold text-zinc-900">
                          ${(item.price * itemQty).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
            {/* Fitting section */}
            {fittingSelection ? (
              /* ── Selected fitting station ── */
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Wrench className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Fitting Service</p>
                      <p className="text-sm font-medium text-zinc-900 truncate">{fittingSelection.centreName}</p>
                      {fittingSelection.address && (
                        <p className="text-xs text-zinc-500 truncate">{fittingSelection.address}</p>
                      )}
                      {fittingSelection.wheelAlignment && (
                        <p className="text-xs text-zinc-500">
                          + {fittingSelection.wheelAlignment.type === '2_wheel' ? '2-Wheel' : fittingSelection.wheelAlignment.type === '4_wheel' ? '4-Wheel' : ''} Alignment
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-zinc-900">
                      A${fittingSelection.totalFittingCost.toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFittingSelection(null)}
                      className="text-[11px] text-red-500 hover:text-red-700 transition-colors mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFitterModalOpen(true)}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Change fitting partner
                </button>
              </div>
            ) : (
              /* ── "Need fitting?" banner ── */
              <button
                type="button"
                onClick={() => setFitterModalOpen(true)}
                className="w-full flex items-center justify-between rounded-xl border-2 border-dashed border-zinc-200 hover:border-primary hover:bg-primary/5 px-4 py-3 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
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

            {/* Subtotal / Total */}
            <div className="space-y-1">
              {fittingSelection && (
                <div className="flex items-center justify-between text-sm text-zinc-600">
                  <span>Tyres subtotal</span>
                  <span>${tyresTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600">
                  {fittingSelection ? 'Total (excl. shipping)' : 'Subtotal'}
                </span>
                <span className="text-base font-bold text-zinc-900">${total.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400">Shipping calculated at checkout</p>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-bold text-zinc-900 hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full rounded-xl border border-zinc-300 py-3 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>

      {/* Fitter selection modal — rendered outside drawer so it can overflow */}
      <FitterSelectionModal
        open={fitterModalOpen}
        onClose={() => setFitterModalOpen(false)}
        tyreQty={tyreQty}
        cartSubtotal={tyresTotal}
      />
    </>
  )
}
