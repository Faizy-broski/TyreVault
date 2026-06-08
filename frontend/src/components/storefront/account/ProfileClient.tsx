'use client'

import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import {
  useCustomerMe,
  useCustomerAddresses,
  useUpdateCustomerProfile,
  useAddAddress,
  useDeleteAddress,
  type CustomerAddress,
} from '@/lib/query/customer-hooks'
import { toastSuccess, toastError } from '@/lib/toast'

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']

function inputCls(extra = '') {
  return `w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${extra}`
}

// ── Personal info form ─────────────────────────────────────────────────────────

function PersonalInfoForm() {
  const { data: profile, isLoading } = useCustomerMe()
  const update = useUpdateCustomerProfile()

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '')
      setLastName(profile.last_name ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      await update.mutateAsync({ first_name: firstName, last_name: lastName, phone })
      toastSuccess('Profile updated')
    } catch (err: any) {
      toastError(err.message ?? 'Failed to update profile')
    }
  }

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-zinc-100" />
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Personal Information</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{profile?.email}</p>
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">First name</label>
            <input
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className={inputCls()}
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Last name</label>
            <input
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className={inputCls()}
              placeholder="Smith"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className={inputCls()}
            placeholder="+61 400 000 000"
          />
        </div>
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

// ── Address card ───────────────────────────────────────────────────────────────

function AddressCard({ address }: { address: CustomerAddress }) {
  const deleteAddr = useDeleteAddress()

  async function handleDelete() {
    if (!confirm('Remove this address?')) return
    try {
      await deleteAddr.mutateAsync(address.address_id)
      toastSuccess('Address removed')
    } catch (err: any) {
      toastError(err.message ?? 'Failed to remove address')
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
      <div className="space-y-0.5">
        <p className="font-semibold text-zinc-800">{address.address_name}</p>
        <p className="text-zinc-600">{address.address_line1}</p>
        {address.address_line2 && <p className="text-zinc-600">{address.address_line2}</p>}
        <p className="text-zinc-600">
          {[address.city, address.state, address.postal_code].filter(Boolean).join(' ')}
        </p>
        {address.phone && <p className="text-zinc-400 text-xs">{address.phone}</p>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleteAddr.isPending}
        aria-label="Remove address"
        className="text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Add address form ───────────────────────────────────────────────────────────

const BLANK_ADDR = {
  address_name:  '',
  address_line1: '',
  address_line2: '',
  city:          '',
  state:         '',
  postal_code:   '',
  country:       'Australia',
  phone:         '',
}

function AddressSection() {
  const { data: addresses, isLoading } = useCustomerAddresses()
  const addAddr = useAddAddress()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_ADDR)

  function field(key: keyof typeof BLANK_ADDR) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await addAddr.mutateAsync(form as any)
      toastSuccess('Address added')
      setForm(BLANK_ADDR)
      setShowForm(false)
    } catch (err: any) {
      toastError(err.message ?? 'Failed to add address')
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">Saved Addresses</h2>

      {isLoading && <div className="h-16 animate-pulse rounded-xl bg-zinc-100" />}

      {addresses && addresses.length === 0 && !showForm && (
        <p className="text-sm text-zinc-500">No saved addresses.</p>
      )}

      {addresses && addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map(addr => <AddressCard key={addr.address_id} address={addr} />)}
        </div>
      )}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> Add new address
        </button>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-sm font-semibold text-zinc-800">New Address</h3>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Label (e.g. Home, Work)</label>
            <input required value={form.address_name} onChange={field('address_name')}
              className={inputCls()} placeholder="Home" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Address line 1 *</label>
            <input required value={form.address_line1} onChange={field('address_line1')}
              className={inputCls()} placeholder="123 Main St" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Address line 2</label>
            <input value={form.address_line2} onChange={field('address_line2')}
              className={inputCls()} placeholder="Unit / Apartment" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Suburb</label>
              <input value={form.city} onChange={field('city')} className={inputCls()} placeholder="Suburb" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Postcode</label>
              <input value={form.postal_code} onChange={field('postal_code')} className={inputCls()} placeholder="4000" maxLength={4} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">State</label>
            <select value={form.state} onChange={field('state')} className={`${inputCls()} bg-white`}>
              <option value="">Select state</option>
              {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Phone (optional)</label>
            <input type="tel" value={form.phone} onChange={field('phone')} className={inputCls()} placeholder="+61 400 000 000" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={addAddr.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {addAddr.isPending ? 'Saving…' : 'Add address'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(BLANK_ADDR) }}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:!bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Profile</h1>
      <PersonalInfoForm />
      <AddressSection />
    </div>
  )
}
