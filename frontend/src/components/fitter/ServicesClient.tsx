'use client'

import { useState, useEffect } from 'react'
import { Save, Wrench, Navigation, Clock } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FitterBreadcrumb } from '@/components/fitter/FitterBreadcrumb'
import type { FitterServices, WorkingHour } from '@/types/fitter.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_HOURS: WorkingHour[] = [
  { day: 'mon_fri',  is_closed: false, open_time: '08:00', close_time: '17:00' },
  { day: 'saturday', is_closed: true,  open_time: '08:00', close_time: '17:00' },
  { day: 'sunday',   is_closed: true,  open_time: '08:00', close_time: '17:00' },
]

const DAY_LABEL: Record<string, string> = {
  mon_fri:  'Monday – Friday',
  saturday: 'Saturday',
  sunday:   'Sunday',
}

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const totalMins = 360 + i * 30
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0')
  const m = (totalMins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

interface Capabilities {
  passenger_suv:   boolean | null
  wheel_packages:  boolean | null
  truck:           boolean | null
}

// ── Sub-components (matching onboarding style) ─────────────────────────────────

function YesNoField({ label, value, onChange }: {
  label: string; value: boolean | null; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className="flex items-center gap-3">
        {(['Yes', 'No'] as const).map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="radio"
              name={label}
              checked={value === (opt === 'Yes')}
              onChange={() => onChange(opt === 'Yes')}
              className="w-4 h-4 accent-yellow-400"
            />
            <span className="text-sm text-zinc-600">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-zinc-900' : 'bg-zinc-300'}`}
    >
      <span className={`absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ServicesClient({ accessToken }: { accessToken: string }) {
  const [capabilities, setCapabilities] = useState<Capabilities>({
    passenger_suv:  null,
    wheel_packages: null,
    truck:          null,
  })
  const [wheelAlignmentOn,    setWheelAlignmentOn]    = useState(false)
  const [wheelAlignmentPrice, setWheelAlignmentPrice] = useState('')
  const [mobileFitting,       setMobileFitting]       = useState(false)
  const [hours,   setHours]   = useState<WorkingHour[]>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch(`${API}/api/fitter/portal/services`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: FitterServices | null) => {
        if (!data) return
        const offered = data.services_offered ?? []
        setCapabilities({
          passenger_suv:  offered.includes('passenger_suv')  ? true : offered.length > 0 ? false : null,
          wheel_packages: offered.includes('wheel_packages') ? true : offered.length > 0 ? false : null,
          truck:          offered.includes('truck')          ? true : offered.length > 0 ? false : null,
        })
        setWheelAlignmentOn(offered.includes('wheel_alignment'))
        setWheelAlignmentPrice(data.wheel_alignment_price != null ? String(data.wheel_alignment_price) : '')
        setMobileFitting(offered.includes('mobile_fitting') || !!data.mobile_fitting_available)
        if (Array.isArray(data.opening_hours) && data.opening_hours.length > 0) {
          setHours(data.opening_hours)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  function updateHour(index: number, patch: Partial<WorkingHour>) {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, ...patch } : h))
    setSaved(false)
  }

  async function handleSave() {
    if (capabilities.passenger_suv === null && capabilities.wheel_packages === null && capabilities.truck === null) {
      setError('Please answer at least one fitting option.')
      return
    }
    setSaving(true); setError('')

    const services_offered: string[] = []
    if (capabilities.passenger_suv)  services_offered.push('passenger_suv')
    if (capabilities.wheel_packages) services_offered.push('wheel_packages')
    if (capabilities.truck)          services_offered.push('truck')
    if (wheelAlignmentOn)            services_offered.push('wheel_alignment')
    if (mobileFitting)               services_offered.push('mobile_fitting')

    try {
      const res = await fetch(`${API}/api/fitter/portal/services`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({
          services_offered,
          wheel_alignment_price:    wheelAlignmentOn && wheelAlignmentPrice ? parseFloat(wheelAlignmentPrice) : null,
          mobile_fitting_available: mobileFitting,
          opening_hours:            hours,
        }),
      })
      if (!res.ok) { setError('Failed to save services.'); return }
      setSaved(true)
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 sm:p-6">
      <FitterBreadcrumb crumbs={[{ label: 'Services' }]} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 mt-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Services</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Configure your fitting capabilities and operating hours</p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || loading}
          className="gap-2 rounded-lg bg-primary text-zinc-900 hover:bg-primary/90 font-semibold disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </Button>
      </div>

      {error && (
        <Alert className="mb-4 rounded-lg bg-red-50 border-red-200 text-red-700">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="mb-4 rounded-lg bg-green-50 border-green-200 text-green-700">
          <AlertDescription>Services saved successfully.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">

          {/* ── Fitting capabilities (Yes/No radio) ── */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-zinc-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Fitting Options</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Select the tyre types you are equipped to fit</p>
              </div>
            </div>
            <div className="px-5 py-2">
              {loading ? (
                <div className="space-y-4 py-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <Skeleton className="h-4 w-64" />
                      <div className="flex gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <YesNoField
                    label="Can you fit Passenger car / 4x4 / SUV Tyres?"
                    value={capabilities.passenger_suv}
                    onChange={v => { setCapabilities(p => ({ ...p, passenger_suv: v })); setSaved(false) }}
                  />
                  <YesNoField
                    label="Can you install tyres and wheel packages?"
                    value={capabilities.wheel_packages}
                    onChange={v => { setCapabilities(p => ({ ...p, wheel_packages: v })); setSaved(false) }}
                  />
                  <YesNoField
                    label="Truck tyre fittings?"
                    value={capabilities.truck}
                    onChange={v => { setCapabilities(p => ({ ...p, truck: v })); setSaved(false) }}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Additional services (toggle switch) ── */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-zinc-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Additional Services</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Optional extras you offer to customers</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
              ) : (
                <>
                  {/* Wheel alignment */}
                  <div className={`rounded-lg border p-3.5 transition-colors duration-150 ${wheelAlignmentOn ? 'border-yellow-300 bg-primary' : 'border-zinc-100 bg-zinc-50/40'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800">Wheel Alignment Available</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Professional wheel alignment service</p>
                        {wheelAlignmentOn && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-sm text-zinc-600 shrink-0">Pricing</span>
                            <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-yellow-400/30 focus-within:border-yellow-400 w-32">
                              <span className="px-2.5 text-sm text-zinc-400 select-none border-r border-zinc-200">$</span>
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={wheelAlignmentPrice}
                                onChange={e => { setWheelAlignmentPrice(e.target.value); setSaved(false) }}
                                placeholder="0.00"
                                className="border-0 rounded-none shadow-none h-auto py-1.5 px-2 text-sm text-zinc-900 bg-white focus-visible:ring-0 placeholder:text-zinc-400 w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <Toggle label="Toggle wheel alignment" checked={wheelAlignmentOn} onChange={v => { setWheelAlignmentOn(v); setSaved(false) }} />
                    </div>
                  </div>

                  {/* Mobile fitting */}
                  <div className={`rounded-lg border p-3.5 transition-colors duration-150 ${mobileFitting ? 'border-yellow-300 bg-primary' : 'border-zinc-100 bg-zinc-50/40'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800">Mobile Fitting Available</p>
                        <p className="text-xs text-zinc-500 mt-0.5">We come to you for fitting</p>
                      </div>
                      <Toggle label="Toggle mobile fitting" checked={mobileFitting} onChange={v => { setMobileFitting(v); setSaved(false) }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Working hours (checkbox + selects) ── */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-none hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Working Days &amp; Timings</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Set your open and close times for each period</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))
              ) : (
                hours.map((h, idx) => (
                  <div key={h.day} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-1.5">
                    <span className={`text-sm ${h.is_closed ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {DAY_LABEL[h.day]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id={`closed-${h.day}`}
                        checked={h.is_closed}
                        onChange={e => updateHour(idx, { is_closed: e.target.checked })}
                        className="w-3.5 h-3.5 accent-zinc-600 cursor-pointer"
                      />
                      <label htmlFor={`closed-${h.day}`} className="text-xs text-zinc-500 cursor-pointer select-none">
                        Closed
                      </label>
                    </div>
                    <select
                      disabled={h.is_closed}
                      value={h.open_time}
                      aria-label={`${DAY_LABEL[h.day]} open time`}
                      onChange={e => updateHour(idx, { open_time: e.target.value })}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                      disabled={h.is_closed}
                      value={h.close_time}
                      aria-label={`${DAY_LABEL[h.day]} close time`}
                      onChange={e => updateHour(idx, { close_time: e.target.value })}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar tips ── */}
        <div className="shrink-0">
          <div className="rounded-2xl bg-primary p-5 xl:sticky xl:top-6">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Service Tips</h3>
            <ul className="space-y-2.5">
              {[
                'Enable only services you are fully equipped to perform.',
                'Mobile fitting increases your reach and job volume significantly.',
                'Wheel alignment pricing should reflect your equipment and labour costs.',
                'Keeping accurate hours prevents customer booking conflicts.',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-800 leading-relaxed">
                  <span className="mt-0.5 shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
