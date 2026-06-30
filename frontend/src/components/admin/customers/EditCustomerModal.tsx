'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

type GroupOption = { group_id: string; group_name: string }

export default function EditCustomerModal({ accessToken, customer, onClose, onSuccess }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [customerType, setCustomerType] = useState<CustomerType>(customer.customer_type ?? 'retail')

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token
      if (!token) return
      fetch(`${BACKEND_API_URL}/api/admin/customers/groups/list?page=1`, {
        headers: createBackendHeaders(token),
      })
        .then(r => r.json())
        .then(d => setGroups(d.groups ?? []))
        .catch(() => {})
    })
  }, [])

  const showCreditFields = ['wholesale', 'fleet', 'trade'].includes(customerType)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch(
        `${BACKEND_API_URL}/api/admin/customers/${customer.customer_id}`,
        {
          method: 'PATCH',
          headers: createBackendHeaders(accessToken, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            email:           fd.get('email'),
            firstName:       fd.get('firstName')      || null,
            lastName:        fd.get('lastName')       || null,
            company:         fd.get('company')        || null,
            phone:           fd.get('phone')          || null,
            customerType:    fd.get('customerType'),
            accountStatus:   fd.get('accountStatus'),
            customerGroupId: fd.get('customerGroupId') || null,
            creditLimit:     fd.get('creditLimit')  ? Number(fd.get('creditLimit'))  : null,
            paymentTerms:    fd.get('paymentTerms') || null,
          }),
        }
      )
      if (!res.ok) throw new Error(await readBackendError(res, 'Update failed'))
      toastSuccess('Customer updated')
      startTransition(() => router.refresh())
      onSuccess ? onSuccess() : onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to update customer')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="block text-sm font-medium text-zinc-700 mb-1">First Name</Label>
                <Input id="firstName" name="firstName" type="text" defaultValue={customer.first_name ?? ''} className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <Label htmlFor="lastName" className="block text-sm font-medium text-zinc-700 mb-1">Last Name</Label>
                <Input id="lastName" name="lastName" type="text" defaultValue={customer.last_name ?? ''} className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>

            <div>
              <Label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1">Business Name</Label>
              <Input id="company" name="company" type="text" defaultValue={customer.business_name ?? ''} className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
            </div>

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={customer.email} className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
            </div>

            <div>
              <Label htmlFor="phone" className="block text-sm font-medium text-zinc-700 mb-1">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={customer.phone ?? ''} className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerType" className="block text-sm font-medium text-zinc-700 mb-1">Customer Type</Label>
                <select
                  id="customerType"
                  name="customerType"
                  value={customerType}
                  onChange={e => setCustomerType(e.target.value as CustomerType)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(['retail', 'wholesale', 'fleet', 'trade'] as CustomerType[]).map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="customerGroupId" className="block text-sm font-medium text-zinc-700 mb-1">Customer Group</Label>
              <select
                id="customerGroupId"
                name="customerGroupId"
                defaultValue={customer.customer_group_id ?? ''}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                ))}
              </select>
            </div>

            {showCreditFields && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creditLimit" className="block text-sm font-medium text-zinc-700 mb-1">Credit Limit ($)</Label>
                  <Input id="creditLimit" name="creditLimit" type="number" step="100" min="0"
                    defaultValue={customer.credit_limit ?? ''}
                    placeholder="5000.00"
                    className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary" />
                </div>
                <div>
                  <Label htmlFor="paymentTerms" className="block text-sm font-medium text-zinc-700 mb-1">Payment Terms</Label>
                  <select
                    id="paymentTerms"
                    name="paymentTerms"
                    defaultValue={customer.payment_terms ?? ''}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select…</option>
                    {['COD', 'NET7', 'NET14', 'NET30', 'NET60', 'account', 'online'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100 sticky bottom-0 bg-white">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="px-4 py-2 text-sm text-zinc-600 border-zinc-300 rounded-lg hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-zinc-900 bg-primary rounded-lg hover:bg-primary/90">
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

