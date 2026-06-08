'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastPromise } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const DEFAULT_HOURS = [
  { day: 'mon_fri',  label: 'Monday – Friday', isClosed: false, openTime: '08:00', closeTime: '17:00' },
  { day: 'saturday', label: 'Saturday',         isClosed: true,  openTime: '08:00', closeTime: '13:00' },
  { day: 'sunday',   label: 'Sunday',           isClosed: true,  openTime: '08:00', closeTime: '13:00' },
]

const EMPTY = {
  email: '',
  password: '',
  full_name: '',
  contact_person: '',
  contact_email: '',
  business_name: '',
  address: '',
  mobile_number: '',
  phone: '',
  business_number: '',
  preferred_partner: false,
  fits_passenger_suv: false,
  fits_wheel_packages: false,
  fits_truck: false,
  wheel_alignment_available: false,
  wheel_alignment_price: '',
  mobile_fitting_available: false,
  fitting_price: '',
}

type EmailStatus = 'idle' | 'checking' | 'taken' | 'available'

export default function CreateFitmentCentrePage() {
  const router = useRouter()
  const [form, setForm]           = useState(EMPTY)
  const [hours, setHours]         = useState(DEFAULT_HOURS)
  const [saving, setSaving]       = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    if (field === 'email') {
      setEmailStatus('idle')
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }

  useEffect(() => {
    const email = form.email.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('idle')
      return
    }
    setEmailStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const token = session?.access_token ?? ''
        const res = await fetch(`${API}/api/admin/fitment-centres/check-email?email=${encodeURIComponent(email)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { exists } = await res.json()
          setEmailStatus(exists ? 'taken' : 'available')
        } else {
          setEmailStatus('idle')
        }
      } catch {
        setEmailStatus('idle')
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.email])

  function setHour(idx: number, key: string, value: string | boolean) {
    setHours(h => h.map((row, i) => i === idx ? { ...row, [key]: value } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const req = (async () => {
      const { data: { session } } = await createClient().auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch(`${API}/api/admin/fitment-centres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          fitting_price:         form.fitting_price         ? Number(form.fitting_price)         : null,
          wheel_alignment_price: form.wheel_alignment_price ? Number(form.wheel_alignment_price) : null,
          working_hours: hours,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create fitment centre')
      return json
    })()

    try {
      const json = await toastPromise(req, {
        loading: 'Creating fitment centre…',
        success: (data) => `"${data.business_name}" created — Partner ID: ${data.partner_id}`,
        error:   (err: unknown) => err instanceof Error ? err.message : 'Something went wrong',
      })
      router.push('/admin/fitters/centres')
      void json
    } catch {
      // error shown by toastPromise
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors'
  const label = 'block text-xs font-semibold text-zinc-600 mb-1.5'

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Fitment Centre', href: '/admin/fitters' },
          { label: 'Applications', href: '/admin/fitters/applications' },
          { label: 'Create Centre' },
        ]} />
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-900">Create Fitment Centre</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Creates a login account and activates the centre immediately — no approval required.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 1. Owner / Applicant ───────────────────────────────────────────── */}
        <Card title="Owner / Applicant" description="The individual responsible for this fitment centre.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Full Name <Req /></label>
              <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="Jane Doe" className={input} />
            </div>
            <div>
              <label className={label}>Contact Person</label>
              <input type="text" value={form.contact_person} onChange={e => set('contact_person', e.target.value)}
                placeholder="Operations manager / day-to-day contact" className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Contact Email</label>
              <input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                placeholder="ops@centre.com.au (if different from login email)" className={input} />
            </div>
          </div>
        </Card>

        {/* ── 3. Business Details ────────────────────────────────────────────── */}
        <Card title="Business Details" description="Legal and contact details for the fitment centre business.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Business Name <Req /></label>
              <input type="text" required value={form.business_name} onChange={e => set('business_name', e.target.value)}
                placeholder="Onyx Shield Brisbane" className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Business Address <Req /></label>
              <input type="text" required value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="123 Main St, Brisbane QLD 4000" className={input} />
            </div>
            <div>
              <label className={label}>Mobile Number <Req /></label>
              <input type="tel" required value={form.mobile_number} onChange={e => set('mobile_number', e.target.value)}
                placeholder="0412 345 678" className={input} />
              <p className="mt-1.5 text-[11px] text-zinc-400">Australian mobile — 04XXXXXXXX</p>
            </div>
            <div>
              <label className={label}>Business Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="07 1234 5678" className={input} />
            </div>
            <div>
              <label className={label}>ABN / ACN <Req /></label>
              <input type="text" required value={form.business_number} onChange={e => set('business_number', e.target.value)}
                placeholder="12 345 678 901" className={input} />
              <p className="mt-1.5 text-[11px] text-zinc-400">11-digit ABN or 9-digit ACN</p>
            </div>
            <div className="flex items-end pb-1">
              <CheckField
                checked={form.preferred_partner}
                onChange={v => set('preferred_partner', v)}
                label="Preferred Partner"
                description="Shown with a badge in search results"
              />
            </div>
          </div>
        </Card>

        {/* ── 4. Services Offered ────────────────────────────────────────────── */}
        <Card title="Services Offered" description="Select all vehicle types and services this centre can handle.">
          <div className="space-y-5">
            {/* Fitting types */}
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2.5">Fitting Types</p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {[
                  { field: 'fits_passenger_suv',  label: 'Passenger / SUV',    icon: '🚗' },
                  { field: 'fits_wheel_packages',  label: 'Wheel Packages',     icon: '🔧' },
                  { field: 'fits_truck',           label: 'Truck / Commercial', icon: '🚛' },
                ].map(({ field, label: l, icon }) => (
                  <label key={field} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                    (form as Record<string, unknown>)[field]
                      ? 'border-primary/50 bg-primary/5 shadow-sm'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                  }`}>
                    <input type="checkbox" checked={(form as Record<string, unknown>)[field] as boolean}
                      onChange={e => set(field, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                    <span className="text-sm text-zinc-700">{icon} {l}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Fitting Price per Tyre ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input type="number" min={0} step={0.01} value={form.fitting_price}
                    onChange={e => set('fitting_price', e.target.value)}
                    placeholder="25.00" className={`${input} pl-7`} />
                </div>
              </div>
              <div>
                <label className={`${label} flex items-center gap-2`}>
                  <input type="checkbox" checked={form.wheel_alignment_available}
                    onChange={e => set('wheel_alignment_available', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                  Wheel Alignment Available
                </label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm transition-colors ${form.wheel_alignment_available ? 'text-zinc-400' : 'text-zinc-300'}`}>$</span>
                  <input type="number" min={0} step={0.01} value={form.wheel_alignment_price}
                    disabled={!form.wheel_alignment_available}
                    onChange={e => set('wheel_alignment_price', e.target.value)}
                    placeholder="89.00"
                    className={`${input} pl-7 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-50`} />
                </div>
              </div>
            </div>

            {/* Mobile fitting */}
            <CheckField
              checked={form.mobile_fitting_available}
              onChange={v => set('mobile_fitting_available', v)}
              label="Mobile Fitting Available"
              description="Centre can travel to the customer's location"
            />
          </div>
        </Card>

        {/* ── 5. Working Hours ───────────────────────────────────────────────── */}
        <Card title="Working Hours" description="Set the centre's regular operating hours. Toggle 'Closed' for days the centre doesn't operate.">
          <div className="space-y-2.5">
            {hours.map((row, i) => (
              <div key={row.day} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                row.isClosed ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white'
              }`}>
                <span className={`text-sm font-medium w-36 shrink-0 ${row.isClosed ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {row.label}
                </span>

                {row.isClosed ? (
                  <span className="text-xs text-zinc-400 flex-1">Closed</span>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={row.openTime}
                      onChange={e => setHour(i, 'openTime', e.target.value)}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-xs text-zinc-400">to</span>
                    <input type="time" value={row.closeTime}
                      onChange={e => setHour(i, 'closeTime', e.target.value)}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                )}

                <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                  <input type="checkbox" checked={row.isClosed}
                    onChange={e => setHour(i, 'isClosed', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                  <span className="text-xs text-zinc-500">Closed</span>
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* ── 5. Login Credentials ──────────────────────────────────────────── */}
        <Card title="Login Credentials" description="The email and password the fitment centre owner will use to log in.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Login Email <Req /></label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="fitter@example.com.au"
                  className={`${input} pr-28 ${emailStatus === 'taken' ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : emailStatus === 'available' ? 'border-green-400 focus:border-green-400 focus:ring-green-200' : ''}`}
                />
                {emailStatus !== 'idle' && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 ${
                    emailStatus === 'checking' ? 'text-zinc-400' :
                    emailStatus === 'taken'    ? 'text-red-500'  : 'text-green-600'
                  }`}>
                    {emailStatus === 'checking' && <><span className="w-3 h-3 rounded-full border-2 border-zinc-300 border-t-zinc-500 animate-spin" />Checking…</>}
                    {emailStatus === 'taken'    && <>✕ Already registered</>}
                    {emailStatus === 'available' && <>✓ Available</>}
                  </span>
                )}
              </div>
              {emailStatus === 'taken' && (
                <p className="mt-1.5 text-xs text-red-500">An account with this email already exists. Use a different email.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Password <Req /></label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required minLength={8}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 8 characters" className={`${input} pr-11`} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  {showPass ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">Share this with the centre owner so they can log in immediately.</p>
            </div>
          </div>
        </Card>

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <button type="submit" disabled={saving || emailStatus === 'taken' || emailStatus === 'checking'}
            className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {saving
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating…</>
              : <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg> Create Fitment Centre</>
            }
          </button>
        </div>

      </form>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/60">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

function CheckField({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-zinc-300 accent-primary" />
      <div>
        <p className="text-sm font-medium text-zinc-700">{label}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
      </div>
    </label>
  )
}

function Req() { return <span className="text-red-500 ml-0.5">*</span> }

function EyeOn() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

