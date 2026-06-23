'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface SheetProps {
  open:     boolean
  onClose:  () => void
  title:    string
  children: React.ReactNode
  footer?:  React.ReactNode
  width?:   string
}

export function Sheet({ open, onClose, title, children, footer, width = 'w-full max-w-md' }: SheetProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl ${width}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-zinc-200 px-5 py-4 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
