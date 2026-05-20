'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CustomerListItem, CustomerType, AccountStatus } from '@/types/admin.types'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'

type Props = {
  accessToken: string
  customer: CustomerListItem
  onClose: () => void
  onSuccess?: () => void
}

const FIELDS = [
  { name: 'email',     label: 'Email',      type: 'email' as const },
  { name: 'firstName', label: 'First Name', type: 'text'  as const },
  { name: 'lastName',  label: 'Last Name',  type: 'text'  as const },
  { name: 'company',   label: 'Company',    type: 'text'  as const },
  { name: 'phone',     label: 'Phone',      type: 'tel'   as const },
]

export default function EditCustomerModal({ accessToken, customer, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaults: Record<string, string> = {
    email:     customer.email            ?? '',
    firstName: customer.first_name       ?? '',
    lastName:  customer.last_name        ?? '',
    company:   customer.business_name      ?? '',
    phone:     customer.phone            ?? '',
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}`,
        {
          method: 'PATCH',
          headers: createBackendHeaders(accessToken, {
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email:         fd.get('email'),
            firstName:     fd.get('firstName'),
            lastName:      fd.get('lastName'),
            company:       fd.get('company'),
            phone:         fd.get('phone'),
            customerType:  fd.get('customerType'),
            accountStatus: fd.get('accountStatus'),
          }),
        }
      )
      if (!res.ok) {
        throw new Error(await readBackendError(res, 'Update failed'))
      }
      toastSuccess('Customer updated')
      startTransition(() => router.refresh())
      onSuccess ? onSuccess() : onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update customer')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Edit Customer</DialogTitle>
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
            {FIELDS.map(field => (
              <div key={field.name}>
                <Label htmlFor={field.name} className="block text-sm font-medium text-zinc-700 mb-1">
                  {field.label}
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  defaultValue={defaults[field.name]}
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerType" className="block text-sm font-medium text-zinc-700 mb-1">Customer Type</Label>
                <select
                  id="customerType"
                  name="customerType"
                  defaultValue={customer.customer_type ?? 'retail'}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(['retail', 'wholesale', 'fleet', 'trade'] as CustomerType[]).map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="accountStatus" className="block text-sm font-medium text-zinc-700 mb-1">Account Status</Label>
                <select
                  id="accountStatus"
                  name="accountStatus"
                  defaultValue={customer.account_status ?? 'active'}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(['active', 'paused', 'blocked'] as AccountStatus[]).map(s => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
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
