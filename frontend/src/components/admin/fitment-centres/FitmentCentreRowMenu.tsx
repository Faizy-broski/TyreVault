'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Pencil, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminFitmentCentreSummary } from '@/types/admin.types'
import {
  BACKEND_API_URL,
  createBackendHeaders,
  readBackendError,
} from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'

interface Props {
  centre:       AdminFitmentCentreSummary
  accessToken:  string
  onUpdated:    (updated: AdminFitmentCentreSummary) => void
}

export default function FitmentCentreRowMenu({ centre, accessToken, onUpdated }: Props) {
  const [open, setOpen]         = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [saving, setSaving]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    const headers = createBackendHeaders(accessToken, {
      'Content-Type': 'application/json',
    })

    try {
      const [profileRes, statusRes] = await Promise.all([
        fetch(`${BACKEND_API_URL}/api/admin/fitment-centres/${centre.fitment_centre_id}/profile`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            business_name:   fd.get('businessName'),
            contact_phone:   fd.get('contactPhone') || null,
            business_number: fd.get('businessNumber') || null,
          }),
        }),
        fetch(`${BACKEND_API_URL}/api/admin/fitment-centres/${centre.fitment_centre_id}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_active: fd.get('isActive') === 'true' }),
        }),
      ])

      if (!profileRes.ok || !statusRes.ok) {
        const failed = profileRes.ok ? statusRes : profileRes
        throw new Error(await readBackendError(failed, 'Failed to save changes'))
      }

      toastSuccess('Fitment centre updated')
      onUpdated({
        ...centre,
        business_name:   String(fd.get('businessName')),
        contact_phone:   (fd.get('contactPhone') as string) || null,
        business_number: (fd.get('businessNumber') as string) || null,
        is_active:       fd.get('isActive') === 'true',
      })
      setShowEdit(false)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div ref={ref} className="relative inline-block">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Centre actions"
          onClick={() => setOpen(o => !o)}
                    className="p-1.5 rounded-md border text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-zinc-200 bg-white shadow-lg py-1">
            <button
              type="button"
              onClick={() => { setOpen(false); setShowEdit(true) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-400" />
              Edit Centre
            </button>
          </div>
        )}
      </div>

      <Dialog open={showEdit} onOpenChange={o => { if (!o) setShowEdit(false) }}>
        <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
            <DialogTitle className="text-base font-semibold text-zinc-900">Edit Fitment Centre</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X className="w-4 h-4" />
              </Button>
            </DialogClose>
          </div>
          <form onSubmit={handleEdit}>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="businessName"
                  name="businessName"
                  required
                  defaultValue={centre.business_name}
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-zinc-700 mb-1">Contact Phone</label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  defaultValue={centre.contact_phone ?? ''}
                  placeholder="+61 4xx xxx xxx"
                />
              </div>

              <div>
                <label htmlFor="businessNumber" className="block text-sm font-medium text-zinc-700 mb-1">ABN / Business Number</label>
                <Input
                  id="businessNumber"
                  name="businessNumber"
                  defaultValue={centre.business_number ?? ''}
                  placeholder="XX XXX XXX XXX"
                />
              </div>

              <div>
                <label htmlFor="isActive" className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={String(centre.is_active)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="true">Active</option>
                  <option value="false">Hold</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
