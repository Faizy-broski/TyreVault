'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastPromise, toastError } from '@/lib/toast'
import type { AdminFitmentCentreDetail } from '@/types/admin.types'

const API = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type WorkingHour = { day: string; label: string; isClosed: boolean; openTime: string; closeTime: string }

const DEFAULT_HOURS: WorkingHour[] = [
  { day: 'mon_fri',  label: 'Monday – Friday', isClosed: false, openTime: '08:00', closeTime: '17:00' },
  { day: 'saturday', label: 'Saturday',         isClosed: true,  openTime: '08:00', closeTime: '13:00' },
  { day: 'sunday',   label: 'Sunday',           isClosed: true,  openTime: '08:00', closeTime: '13:00' },
]

function centreToForm(c: AdminFitmentCentreDetail) {
  const svcs = c.services_offered ?? []
  return {
    business_name:            c.business_name   ?? '',
    contact_name:             c.contact_name    ?? '',
    contact_phone:            c.contact_phone   ?? '',
    phone:                    c.phone           ?? '',
    email:                    c.email           ?? '',
    business_number:          c.business_number ?? '',
    approved_status:          c.approved_status ?? 'approved',
    is_active:                c.is_active,
    fits_passenger_suv:       svcs.includes('passenger') || svcs.includes('suv'),
    fits_wheel_packages:      svcs.includes('wheel_packages'),
    fits_truck:               svcs.includes('truck'),
    fitting_price:            c.fitting_price           != null ? String(c.fitting_price)           : '',
    wheel_alignment_available: c.wheel_alignment_price   != null,
    wheel_alignment_price:    c.wheel_alignment_price    != null ? String(c.wheel_alignment_price)   : '',
    mobile_fitting_available: c.mobile_fitting_available ?? false,
    preferred_partner:        c.preferred_partner        ?? false,
  }
}

export default function EditFitmentCentrePage() {
  const { id }    = useParams<{ id: string }>()
  const router    = useRouter()
  const [centre,  setCentre]  = useState<AdminFitmentCentreDetail | null>(null)
  const [token,   setToken]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<ReturnType<typeof centreToForm> | null>(null)
  const [hours,   setHours]   = useState<WorkingHour[]>(DEFAULT_HOURS)

  useEffect(() => {
    if (!id) return
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''
        setToken(tok)
        const res = await fetch(`${API}/api/admin/fitment-centres/${id}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) throw new Error(`API returned ${res.status}`)
        const data: AdminFitmentCentreDetail = await res.json()
        setCentre(data)
        setForm(centreToForm(data))
        const raw = data.opening_hours
        if (Array.isArray(raw) && raw.length > 0) setHours(raw as WorkingHour[])
      } catch (err) {
        toastError(err instanceof Error ? err.message : 'Failed to load centre')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm(f => f ? { ...f, [field]: value } : f)
  }

  function setHour(idx: number, key: string, value: string | boolean) {
    setHours(h => h.map((row, i) => i === idx ? { ...row, [key]: value } : row))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)

    const services: string[] = []
    if (form.fits_passenger_suv)  services.push('passenger', 'suv')
    if (form.fits_wheel_packages) services.push('wheel_packages')
    if (form.fits_truck)          services.push('truck')

    const req = fetch(`${API}/api/admin/fitment-centres/${id}/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        business_name:            form.business_name,
        contact_name:             form.contact_name             || null,
        contact_phone:            form.contact_phone            || null,
        phone:                    form.phone                    || null,
        email:                    form.email                    || null,
        business_number:          form.business_number          || null,
        approved_status:          form.approved_status,
        is_active:                form.is_active,
        fitting_price:            form.fitting_price            ? Number(form.fitting_price)            : null,
        wheel_alignment_price:    form.wheel_alignment_available ? (form.wheel_alignment_price ? Number(form.wheel_alignment_price) : null) : null,
        mobile_fitting_available: form.mobile_fitting_available,
        preferred_partner:        form.preferred_partner,
        services_offered:         services,
        opening_hours:            hours,
      }),
    }).then(async res => {
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
    })

    try {
      await toastPromise(req, {
        loading: 'Saving changes…',
        success: 'Fitment centre updated',
        error:   (err: unknown) => err instanceof Error ? err.message : 'Something went wrong',
      })
      router.push(`/admin/fitters/${id}`)
    } catch {
      // error shown by toastPromise
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors'
  const lbl = 'block text-xs font-semibold text-zinc-600 mb-1.5'

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />)}
    </div>
  )

  if (!centre || !form) return (
    <div className="p-6 text-sm text-zinc-500">Centre not found.</div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Fitment Centre', href: '/admin/fitters' },
          { label: centre.business_name, href: `/admin/fitters/${id}` },
          { label: 'Edit' },
        ]} />
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-900">Edit Fitment Centre</h1>
          <p className="text-sm text-zinc-500 mt-1">Partner ID: <span className="font-medium text-zinc-700">{centre.partner_id}</span></p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 1. Business Details ────────────────────────────────────────────── */}
        <Card title="Business Details" description="Core identity and contact information for this fitment centre.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={lbl}>Business Name <Req /></label>
              <input type="text" required value={form.business_name}
                onChange={e => set('business_name', e.target.value)}
                placeholder="Onyx Shield Brisbane" className={inp} />
            </div>
            <div>
              <label className={lbl}>Contact Name</label>
              <input type="text" value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                placeholder="Jane Doe" className={inp} />
            </div>
            <div>
              <label className={lbl}>Business Number (ABN / ACN)</label>
              <input type="text" value={form.business_number}
                onChange={e => set('business_number', e.target.value)}
                placeholder="12 345 678 901" className={inp} />
            </div>
            <div>
              <label className={lbl}>Contact Phone</label>
              <input type="tel" value={form.contact_phone}
                onChange={e => set('contact_phone', e.target.value)}
                placeholder="0412 345 678" className={inp} />
            </div>
            <div>
              <label className={lbl}>Business Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="07 1234 5678" className={inp} />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Email</label>
              <input type="email" value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="centre@example.com.au" className={inp} />
            </div>
          </div>
        </Card>

        {/* ── 2. Status ─────────────────────────────────────────────────────── */}
        <Card title="Status & Visibility" description="Control whether this centre appears live and its approval state.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={lbl}>Active Status</label>
              <select value={String(form.is_active)}
                onChange={e => set('is_active', e.target.value === 'true')}
                className={inp}>
                <option value="true">Active</option>
                <option value="false">Hold</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Approval Status</label>
              <select value={form.approved_status}
                onChange={e => set('approved_status', e.target.value)}
                className={inp}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <CheckField checked={form.preferred_partner}
                onChange={v => set('preferred_partner', v)}
                label="Preferred Partner"
                description="Shown with a badge in customer-facing search results" />
            </div>
          </div>
        </Card>

        {/* ── 3. Services Offered ────────────────────────────────────────────── */}
        <Card title="Services Offered" description="All vehicle types and services this centre handles.">
          <div className="space-y-5">
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
                    <input type="checkbox"
                      checked={(form as Record<string, unknown>)[field] as boolean}
                      onChange={e => set(field, e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                    <span className="text-sm text-zinc-700">{icon} {l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Fitting Price per Tyre ($)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                  <input type="number" min={0} step={0.01} value={form.fitting_price}
                    onChange={e => set('fitting_price', e.target.value)}
                    placeholder="25.00" className={`${inp} pl-7`} />
                </div>
              </div>
              <div>
                <label className={`${lbl} flex items-center gap-2`}>
                  <input type="checkbox" checked={form.wheel_alignment_available}
                    onChange={e => set('wheel_alignment_available', e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 accent-primary" />
                  Wheel Alignment Available
                </label>
                <div className="relative">
                  <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm ${form.wheel_alignment_available ? 'text-zinc-400' : 'text-zinc-300'}`}>$</span>
                  <input type="number" min={0} step={0.01}
                    disabled={!form.wheel_alignment_available}
                    value={form.wheel_alignment_price}
                    onChange={e => set('wheel_alignment_price', e.target.value)}
                    placeholder="89.00"
                    className={`${inp} pl-7 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-zinc-50`} />
                </div>
              </div>
            </div>

            <CheckField checked={form.mobile_fitting_available}
              onChange={v => set('mobile_fitting_available', v)}
              label="Mobile Fitting Available"
              description="Centre can travel to the customer's location" />
          </div>
        </Card>

        {/* ── 4. Working Hours ───────────────────────────────────────────────── */}
        <Card title="Working Hours" description="Regular operating hours displayed to customers.">
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

        {/* ── Actions ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 pb-8">
          <button type="button" onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm">
            {saving
              ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Save Changes
                </>
            }
          </button>
        </div>

      </form>
    </div>
  )
}

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
