'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const DEFAULT_HOURS = [
  { day: 'mon_fri',  label: 'Monday – Friday', isClosed: false, openTime: '08:00', closeTime: '17:00' },
  { day: 'saturday', label: 'Saturday',         isClosed: true,  openTime: '08:00', closeTime: '13:00' },
  { day: 'sunday',   label: 'Sunday',           isClosed: true,  openTime: '08:00', closeTime: '13:00' },
]

const EMPTY = {
  // Credentials
  email: '',
  password: '',
  // Identity
  full_name: '',
  contact_person: '',
  contact_email: '',
  // Business
  business_name: '',
  address: '',
  mobile_number: '',
  business_number: '',
  phone: '',
  // Services
  fits_passenger_suv:       false,
  fits_wheel_packages:      false,
  fits_truck:               false,
  wheel_alignment_available: false,
  wheel_alignment_price: '',
  mobile_fitting_available: false,
  fitting_price: '',
  preferred_partner: false,
}

export default function CreateFitmentCentreModal({ open, onClose, onCreated }: Props) {
  const [form, setForm]           = useState(EMPTY)
  const [hours, setHours]         = useState(DEFAULT_HOURS)
  const [saving, setSaving]       = useState(false)
  const [showPass, setShowPass]   = useState(false)

  if (!open) return null

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setHour(idx: number, key: string, value: string | boolean) {
    setHours(h => h.map((row, i) => i === idx ? { ...row, [key]: value } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch(`${API}/api/admin/fitment-centres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          fitting_price:         form.fitting_price          ? Number(form.fitting_price)         : null,
          wheel_alignment_price: form.wheel_alignment_price  ? Number(form.wheel_alignment_price) : null,
          working_hours: hours,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create fitment centre')

      toastSuccess(`"${json.business_name}" created — Partner ID: ${json.partner_id}`)
      setForm(EMPTY)
      setHours(DEFAULT_HOURS)
      onCreated()
      onClose()
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white placeholder:text-zinc-400'
  const labelCls = 'block text-xs font-medium text-zinc-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Create Fitment Centre</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Creates a login account and activates the centre immediately</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">

          {/* ── 1. Login Credentials ─────────────────────────────────────────── */}
          <Section title="Login Credentials">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Login Email <Required /></label>
                <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="fitter@example.com" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Password <Required /></label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required minLength={8}
                    value={form.password} onChange={e => set('password', e.target.value)}
                    placeholder="Min. 8 characters" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    <EyeIcon show={showPass} />
                  </button>
                </div>
              </div>
            </div>
          </Section>

          {/* ── 2. Identity ──────────────────────────────────────────────────── */}
          <Section title="Owner / Applicant">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full Name <Required /></label>
                <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                  placeholder="Jane Doe" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Person</label>
                <input type="text" value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                  placeholder="Operations manager name" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                  placeholder="ops@centre.com.au" className={inputCls} />
              </div>
            </div>
          </Section>

          {/* ── 3. Business Details ──────────────────────────────────────────── */}
          <Section title="Business Details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>Business Name <Required /></label>
                <input type="text" required value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  placeholder="Onyx Shield Brisbane" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Business Address <Required /></label>
                <input type="text" required value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="123 Main St, Brisbane QLD 4000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mobile Number <Required /></label>
                <input type="tel" required value={form.mobile_number} onChange={e => set('mobile_number', e.target.value)}
                  placeholder="0412 345 678" className={inputCls} />
                <p className="mt-1 text-[11px] text-zinc-400">Australian mobile (04XXXXXXXX)</p>
              </div>
              <div>
                <label className={labelCls}>Business Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="07 1234 5678" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ABN / ACN <Required /></label>
                <input type="text" required value={form.business_number} onChange={e => set('business_number', e.target.value)}
                  placeholder="12 345 678 901" className={inputCls} />
                <p className="mt-1 text-[11px] text-zinc-400">11-digit ABN or 9-digit ACN</p>
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={form.preferred_partner}
                    onChange={e => set('preferred_partner', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                  <span className="text-sm text-zinc-700">Preferred Partner</span>
                </label>
              </div>
            </div>
          </Section>

          {/* ── 4. Services ──────────────────────────────────────────────────── */}
          <Section title="Services Offered">
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Select all fitting types this centre handles:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { field: 'fits_passenger_suv',  label: 'Passenger / SUV' },
                  { field: 'fits_wheel_packages',  label: 'Wheel Packages' },
                  { field: 'fits_truck',           label: 'Truck / Commercial' },
                ].map(({ field, label }) => (
                  <label key={field} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    (form as Record<string, unknown>)[field] ? 'border-primary/40 bg-primary/5' : 'border-zinc-200 hover:border-zinc-300'
                  }`}>
                    <input type="checkbox" checked={(form as Record<string, unknown>)[field] as boolean}
                      onChange={e => set(field, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                    <span className="text-sm text-zinc-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                <div>
                  <label className={labelCls}>Fitting Price per Tyre ($)</label>
                  <input type="number" min={0} step={0.01} value={form.fitting_price}
                    onChange={e => set('fitting_price', e.target.value)}
                    placeholder="25.00" className={inputCls} />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input type="checkbox" checked={form.wheel_alignment_available}
                      onChange={e => set('wheel_alignment_available', e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                    <span className="text-xs font-medium text-zinc-700">Wheel Alignment Available</span>
                  </label>
                  <input type="number" min={0} step={0.01} value={form.wheel_alignment_price}
                    disabled={!form.wheel_alignment_available}
                    onChange={e => set('wheel_alignment_price', e.target.value)}
                    placeholder="89.00"
                    className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input type="checkbox" checked={form.mobile_fitting_available}
                  onChange={e => set('mobile_fitting_available', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                <span className="text-sm text-zinc-700">Mobile fitting available (we come to the customer)</span>
              </label>
            </div>
          </Section>

          {/* ── 5. Working Hours ─────────────────────────────────────────────── */}
          <Section title="Working Hours">
            <div className="space-y-2">
              {hours.map((row, i) => (
                <div key={row.day} className={`rounded-lg border p-3 transition-colors ${row.isClosed ? 'border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm font-medium w-36 shrink-0 ${row.isClosed ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {row.label}
                    </span>
                    {row.isClosed ? (
                      <span className="text-xs text-zinc-400 flex-1">Closed</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={row.openTime}
                          onChange={e => setHour(i, 'openTime', e.target.value)}
                          className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <span className="text-xs text-zinc-400">to</span>
                        <input type="time" value={row.closeTime}
                          onChange={e => setHour(i, 'closeTime', e.target.value)}
                          className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                      <input type="checkbox" checked={row.isClosed}
                        onChange={e => setHour(i, 'isClosed', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 accent-primary" />
                      <span className="text-xs text-zinc-500">Closed</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} disabled={saving}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {saving && <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {saving ? 'Creating…' : 'Create Centre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">{title}</p>
      {children}
    </section>
  )
}

function Required() {
  return <span className="text-red-500">*</span>
}

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

