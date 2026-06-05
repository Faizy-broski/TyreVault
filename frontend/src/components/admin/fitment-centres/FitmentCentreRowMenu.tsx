'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AdminFitmentCentreSummary } from '@/types/admin.types'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastPromise } from '@/lib/toast'

interface Props {
  centre:      AdminFitmentCentreSummary
  accessToken: string
  onUpdated:   (updated: AdminFitmentCentreSummary) => void
  onDeleted?:  (id: string) => void
}

export default function FitmentCentreRowMenu({ centre, accessToken, onDeleted }: Props) {
  const [open, setOpen]             = useState(false)
  const [rect, setRect]             = useState<DOMRect | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const router  = useRouter()

  const toggle = useCallback(() => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(o => !o)
    setConfirming(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || dropRef.current?.contains(t)) return
      setOpen(false)
      setConfirming(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  async function handleDelete() {
    setDeleting(true)
    const req = fetch(`${BACKEND_API_URL}/api/admin/fitment-centres/${centre.fitment_centre_id}`, {
      method: 'DELETE',
      headers: createBackendHeaders(accessToken),
    }).then(async res => {
      if (!res.ok) throw new Error(await readBackendError(res, 'Failed to delete'))
    })

    try {
      await toastPromise(req, {
        loading: `Deleting "${centre.business_name}"…`,
        success: `"${centre.business_name}" deleted`,
        error:   (err: unknown) => err instanceof Error ? err.message : 'Failed to delete',
      })
      setOpen(false)
      onDeleted?.(centre.fitment_centre_id)
    } catch {
      // error shown by toastPromise
    } finally {
      setDeleting(false)
    }
  }

  const dropdown = open && rect ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'fixed',
        top:  rect.bottom + 4,
        left: rect.right - 168,
        zIndex: 9999,
        width: 168,
      }}
      className="rounded-xl border border-zinc-200 bg-white shadow-lg py-1 overflow-hidden"
    >
      {/* Edit */}
      <button
        type="button"
        onClick={() => { setOpen(false); router.push(`/admin/fitters/${centre.fitment_centre_id}/edit`) }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit Centre
      </button>

      <div className="my-1 border-t border-zinc-100" />

      {/* Delete — two-step */}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Centre
        </button>
      ) : (
        <div className="px-3.5 py-2.5 space-y-2">
          <p className="text-xs text-zinc-600 font-medium">Delete permanently?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  ) : null

  return (
    <>
      <Button
        ref={btnRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Centre actions"
        onClick={toggle}
        className="p-1.5 rounded-md border border-zinc-200 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>
      {dropdown}
    </>
  )
}

