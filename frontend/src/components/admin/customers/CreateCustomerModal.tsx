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
import type { CustomerType } from '@/types/admin.types'

interface Props {
  accessToken: string
  onClose: () => void
}

const FIELDS = [
  { name: 'email',     label: 'Email',      type: 'email', required: true,  placeholder: 'customer@example.com' },
  { name: 'firstName', label: 'First Name', type: 'text',  required: false, placeholder: 'John' },
  { name: 'lastName',  label: 'Last Name',  type: 'text',  required: false, placeholder: 'Smith' },
  { name: 'company',   label: 'Company',    type: 'text',  required: false, placeholder: 'Acme Co.' },
  { name: 'phone',     label: 'Phone',      type: 'tel',   required: false, placeholder: '+61 4XX XXX XXX' },
] as const

export default function CreateCustomerModal({ accessToken, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(`${BACKEND_API_URL}/api/admin/customers`, {
        method: 'POST',
        headers: createBackendHeaders(accessToken, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email:        fd.get('email'),
          firstName:    fd.get('firstName'),
          lastName:     fd.get('lastName'),
          company:      fd.get('company')      || undefined,
          phone:        fd.get('phone')        || undefined,
          customerType: fd.get('customerType') || undefined,
        }),
      })
      if (!res.ok) {
        throw new Error(await readBackendError(res))
      }
      toastSuccess('Customer created')
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create customer')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-md" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Create Customer</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {FIELDS.map(f => (
              <div key={f.name}>
                <Label htmlFor={f.name} className="block text-sm font-medium text-zinc-700 mb-1">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type}
                  required={f.required}
                  placeholder={f.placeholder}
                  className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary placeholder:text-zinc-400"
                />
              </div>
            ))}

            <div>
              <Label htmlFor="customerType" className="block text-sm font-medium text-zinc-700 mb-1">Customer Type</Label>
              <select
                id="customerType"
                name="customerType"
                defaultValue="retail"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {(['retail', 'wholesale', 'fleet', 'trade'] as CustomerType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
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
              {isPending ? 'Creating…' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
