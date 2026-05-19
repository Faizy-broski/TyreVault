'use client'

import { useTransition } from 'react'
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
  customerId: string
  onClose: () => void
  onSuccess?: () => void
}

export default function CreateAddressModal({ accessToken, customerId, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customerId}/addresses`,
        {
          method: 'POST',
          headers: createBackendHeaders(accessToken, {
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            addressName:  fd.get('addressName'),
            addressLine1: fd.get('addressLine1'),
            addressLine2: fd.get('addressLine2') || undefined,
            postalCode:   fd.get('postalCode')   || undefined,
            city:         fd.get('city')         || undefined,
            country:      fd.get('country')      || undefined,
            state:        fd.get('state')        || undefined,
            company:      fd.get('company')      || undefined,
            phone:        fd.get('phone')        || undefined,
          }),
        }
      )
      if (!res.ok) {
        throw new Error(await readBackendError(res, 'Failed to create address'))
      }
      toastSuccess('Address saved')
      startTransition(() => router.refresh())
      onSuccess ? onSuccess() : onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to save address')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-lg" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Create Address</DialogTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">esc</span>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </Button>
            </DialogClose>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <Label htmlFor="addressName" className="block text-sm font-medium text-zinc-700 mb-1">
                Address name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="addressName"
                name="addressName"
                required
                placeholder="Home, Office, Warehouse…"
                className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addressLine1" className="block text-sm font-medium text-zinc-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  required
                  placeholder="123 Main St"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="addressLine2" className="block text-sm font-medium text-zinc-700 mb-1">
                  <span className="text-zinc-500">Apartment, suite, etc.</span>{' '}
                  <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  placeholder="Apt 4B"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode" className="block text-sm font-medium text-zinc-700 mb-1">
                  Postal Code <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder="2000"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="city" className="block text-sm font-medium text-zinc-700 mb-1">
                  City <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Sydney"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country" className="block text-sm font-medium text-zinc-700 mb-1">Country</Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="Australia"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="state" className="block text-sm font-medium text-zinc-700 mb-1">
                  State <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="NSW"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1">
                  Company <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="company"
                  name="company"
                  placeholder="Acme Pty Ltd"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">
                  Phone <span className="text-xs text-zinc-400">(Optional)</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+61 400 000 000"
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="px-4 py-2 text-sm text-zinc-600 border-zinc-300 rounded-lg hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-zinc-900 bg-primary rounded-lg hover:bg-primary/90"
            >
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
