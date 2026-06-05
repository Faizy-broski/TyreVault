'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'

type Props = {
  accessToken: string
  onClose: () => void
}

const DISCOUNT_TYPES = ['percent', 'fixed_amount']
const PRICE_TYPES    = ['retail', 'wholesale', 'price_a', 'price_b', 'special', 'clearance']

function Toggle({ checked, onChange, label, description }: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${checked ? 'border-green-200 bg-green-50/50' : 'border-zinc-200'}`}
      onClick={() => onChange(!checked)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5 ${checked ? 'bg-green-500' : 'bg-zinc-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  )
}

export default function CreateGroupModal({ accessToken, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [canViewWholesale, setCanViewWholesale] = useState(false)
  const [isActive, setIsActive]               = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string).trim()
    if (!name) { toastError('Group name is required'); return }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/admin/customers/groups`, {
        method: 'POST',
        headers: createBackendHeaders(accessToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name,
          description:        fd.get('description')    || null,
          default_discount:   fd.get('default_discount') ? Number(fd.get('default_discount')) : null,
          discount_type:      fd.get('discount_type')  || null,
          discount_value:     fd.get('discount_value') ? Number(fd.get('discount_value')) : null,
          price_type:         fd.get('price_type')     || null,
          can_view_wholesale: canViewWholesale,
          is_active:          isActive,
        }),
      })
      if (!res.ok) throw new Error(await readBackendError(res, 'Failed to create group'))
      toastSuccess('Group created')
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Create Customer Group</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Name */}
            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
                Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                autoFocus
                placeholder="e.g. Wholesale, VIP, Trade"
                className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="block text-sm font-medium text-zinc-700 mb-1">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Optional description…"
                className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            {/* Default Discount */}
            <div>
              <Label htmlFor="default_discount" className="block text-sm font-medium text-zinc-700 mb-1">Default Discount (%)</Label>
              <Input
                id="default_discount"
                name="default_discount"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 10.00"
                className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
              />
              <p className="mt-1 text-xs text-zinc-400">Applied automatically to all orders from this group.</p>
            </div>

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount_type" className="block text-sm font-medium text-zinc-700 mb-1">Discount Type</Label>
                <select
                  id="discount_type"
                  name="discount_type"
                  defaultValue=""
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">None</option>
                  {DISCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{t === 'percent' ? 'Percent (%)' : 'Fixed Amount ($)'}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="discount_value" className="block text-sm font-medium text-zinc-700 mb-1">Discount Value</Label>
                <Input
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 10 or 15.00"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            {/* Price Tier */}
            <div>
              <Label htmlFor="price_type" className="block text-sm font-medium text-zinc-700 mb-1">Price Tier Override</Label>
              <select
                id="price_type"
                name="price_type"
                defaultValue=""
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Default (retail)</option>
                {PRICE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1">
              <Toggle
                checked={canViewWholesale}
                onChange={setCanViewWholesale}
                label="Wholesale Portal Access"
                description="Members can see wholesale pricing and place wholesale orders"
              />
              <Toggle
                checked={isActive}
                onChange={setIsActive}
                label="Active"
                description={isActive ? 'Group is active and assignable to customers' : 'Group is disabled — customers will not be affected'}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="px-4 py-2 text-sm text-zinc-600 border-zinc-300 rounded-lg hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-zinc-900 bg-primary rounded-lg hover:bg-primary/90">
              {isPending ? 'Creating…' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

