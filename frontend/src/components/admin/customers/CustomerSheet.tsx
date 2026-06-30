'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'
import type { CustomerListItem, CustomerType, AccountStatus } from '@/types/admin.types'

type GroupOption = { group_id: string; group_name: string }

const sel = 'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30'

interface Props {
  open:        boolean
  onClose:     () => void
  onSaved:     () => void
  accessToken: string
  customer?:   CustomerListItem | null
}

export default function CustomerSheet({ open, onClose, onSaved, accessToken, customer }: Props) {
  const isEdit = !!customer
  const [groups, setGroups]           = useState<GroupOption[]>([])
  const [customerType, setCustomerType] = useState<CustomerType>(customer?.customer_type ?? 'retail')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    if (!open) return
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
  }, [open])

  useEffect(() => {
    setCustomerType(customer?.customer_type ?? 'retail')
  }, [customer])

  const showCreditFields = ['wholesale', 'fleet', 'trade'].includes(customerType)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaving(true)
    try {
      const url    = isEdit ? `${BACKEND_API_URL}/api/admin/customers/${customer!.customer_id}` : `${BACKEND_API_URL}/api/admin/customers`
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: createBackendHeaders(accessToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email:           fd.get('email'),
          firstName:       fd.get('firstName')      || null,
          lastName:        fd.get('lastName')        || null,
          company:         fd.get('company')         || null,
          phone:           fd.get('phone')           || null,
          customerType:    fd.get('customerType')    || 'retail',
          accountStatus:   fd.get('accountStatus')   || 'active',
          customerGroupId: fd.get('customerGroupId') || null,
          creditLimit:     fd.get('creditLimit')  ? Number(fd.get('creditLimit'))  : null,
          paymentTerms:    fd.get('paymentTerms') || null,
        }),
      })
      if (!res.ok) throw new Error(await readBackendError(res))
      toastSuccess(isEdit ? 'Customer updated' : 'Customer created')
      onSaved()
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Customer' : 'Create Customer'}
      width="w-full max-w-lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cs-first" className="block text-sm font-medium text-zinc-700 mb-1">First Name</Label>
              <Input id="cs-first" name="firstName" type="text" placeholder="Jane" defaultValue={customer?.first_name ?? ''} autoFocus={!isEdit} />
            </div>
            <div>
              <Label htmlFor="cs-last" className="block text-sm font-medium text-zinc-700 mb-1">Last Name</Label>
              <Input id="cs-last" name="lastName" type="text" placeholder="Smith" defaultValue={customer?.last_name ?? ''} />
            </div>
          </div>

          <div>
            <Label htmlFor="cs-company" className="block text-sm font-medium text-zinc-700 mb-1">Business Name</Label>
            <Input id="cs-company" name="company" type="text" placeholder="For wholesale / fleet accounts" defaultValue={customer?.business_name ?? ''} />
          </div>

          <div>
            <Label htmlFor="cs-email" className="block text-sm font-medium text-zinc-700 mb-1">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input id="cs-email" name="email" type="email" required placeholder="customer@example.com" defaultValue={customer?.email ?? ''} />
          </div>

          <div>
            <Label htmlFor="cs-phone" className="block text-sm font-medium text-zinc-700 mb-1">Phone</Label>
            <Input id="cs-phone" name="phone" type="tel" placeholder="+61 4XX XXX XXX" defaultValue={customer?.phone ?? ''} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cs-type" className="block text-sm font-medium text-zinc-700 mb-1">Customer Type</Label>
              <select
                id="cs-type"
                name="customerType"
                value={customerType}
                onChange={e => setCustomerType(e.target.value as CustomerType)}
                className={sel}
              >
                {(['retail', 'wholesale', 'fleet', 'trade'] as CustomerType[]).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cs-status" className="block text-sm font-medium text-zinc-700 mb-1">Account Status</Label>
              <select
                id="cs-status"
                name="accountStatus"
                defaultValue={customer?.account_status ?? 'active'}
                className={sel}
              >
                {(['active', 'paused', 'blocked'] as AccountStatus[]).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="cs-group" className="block text-sm font-medium text-zinc-700 mb-1">Customer Group</Label>
            <select
              id="cs-group"
              name="customerGroupId"
              defaultValue={customer?.customer_group_id ?? ''}
              className={sel}
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
                <Label htmlFor="cs-credit" className="block text-sm font-medium text-zinc-700 mb-1">Credit Limit ($)</Label>
                <Input id="cs-credit" name="creditLimit" type="number" step="100" min="0" placeholder="5000.00" defaultValue={customer?.credit_limit ?? ''} />
              </div>
              <div>
                <Label htmlFor="cs-terms" className="block text-sm font-medium text-zinc-700 mb-1">Payment Terms</Label>
                <select id="cs-terms" name="paymentTerms" defaultValue={customer?.payment_terms ?? ''} className={sel}>
                  <option value="">Select…</option>
                  {['COD', 'NET7', 'NET14', 'NET30', 'NET60', 'account', 'online'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-5 border-t border-zinc-100 mt-5">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
