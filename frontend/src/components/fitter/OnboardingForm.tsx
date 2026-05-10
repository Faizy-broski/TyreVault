'use client'

import { useState } from 'react'
import Image from 'next/image'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkingHour {
  day:       string
  label:     string
  isClosed:  boolean
  openTime:  string
  closeTime: string
}

interface FormData {
  // Step 1
  fullName: string
  email:    string
  // Step 2
  contactPerson:  string
  contactEmail:   string
  address:        string
  addressConfirmed: boolean
  mobileNumber:   string
  mobileConfirmed: boolean
  businessNumber: string
  businessConfirmed: boolean
  // Step 3
  fitsPassengerSuv:  boolean | null
  fitsWheelPackages: boolean | null
  fitsTruck:         boolean | null
  wheelAlignmentAvailable: boolean
  wheelAlignmentPrice:     string
  mobileFittingAvailable:  boolean
  workingHours: WorkingHour[]
}

const DEFAULT_HOURS: WorkingHour[] = [
  { day: 'mon_fri', label: 'Monday – Friday', isClosed: false, openTime: '08:00', closeTime: '17:00' },
  { day: 'saturday', label: 'Saturday',        isClosed: true,  openTime: '08:00', closeTime: '17:00' },
  { day: 'sunday',   label: 'Sunday',          isClosed: true,  openTime: '08:00', closeTime: '17:00' },
]

const TIME_OPTIONS = Array.from({ length: 32 }, (_, i) => {
  const totalMins = 360 + i * 30 // 6:00 to 21:30
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0')
  const m = (totalMins % 60).toString().padStart(2, '0')
  return `${h}:${m}`
})

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i < step ? 'bg-yellow-400' : 'bg-zinc-200'
          }`}
        />
      ))}
    </div>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-zinc-700 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-colors ${className}`}
      {...props}
    />
  )
}

function ConfirmField({
  label, value, confirmed, onChange, onConfirm, placeholder, type = 'text',
}: {
  label: string
  value: string
  confirmed: boolean
  onChange: (v: string) => void
  onConfirm: () => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border px-4 py-2.5 pr-24 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 transition-colors ${
            confirmed ? 'border-green-400 bg-green-50' : 'border-zinc-300'
          }`}
        />
        {confirmed ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-green-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Confirmed
          </span>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={!value.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-yellow-600 hover:text-yellow-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
          >
            CONFIRM?
          </button>
        )}
      </div>
    </div>
  )
}

function YesNoField({
  label, value, onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className="flex items-center gap-2">
        {(['Yes', 'No'] as const).map(opt => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-yellow-400' : 'bg-zinc-300'}`}
    >
      <span className={`absolute left-0 top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Info Panel ────────────────────────────────────────────────────────────────

function InfoPanel() {
  const [open, setOpen] = useState<string | null>(null)

  const items = [
    {
      id: 'process', icon: '🎨', label: 'Process',
      content: 'Submit your application, our team reviews it within 2 business days, and we\'ll contact you to complete setup and training before going live.',
    },
    {
      id: 'pricing', icon: '💛', label: 'Pricing Structure',
      content: 'You set your own labour rates per service. Tyre Vault charges a small platform fee on completed jobs. No monthly subscription — you only pay when you earn.',
    },
    {
      id: 'requirements', icon: '📋', label: 'Requirements',
      content: 'Valid ABN, public liability insurance, mobile or fixed fitting location, and ability to fulfil same/next-day fitting appointments in your area.',
    },
  ]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900 mb-1">Important Information</h2>
      <p className="text-xs text-zinc-500 mb-4">Please review before proceeding</p>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="rounded-lg border border-zinc-100">
            <button
              type="button"
              onClick={() => setOpen(open === item.id ? null : item.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.icon}</span>
                <span className="text-sm font-medium text-zinc-700">{item.label}</span>
              </div>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${open === item.id ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {open === item.id && (
              <div className="px-3 pb-3 text-xs text-zinc-500 leading-relaxed border-t border-zinc-100 pt-2">
                {item.content}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
        By continuing, you acknowledge that you have read and agree to our terms.
      </p>
    </div>
  )
}

// ── Step Components ───────────────────────────────────────────────────────────

function Step1({
  data, onChange, onNext, error,
}: {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
  onNext: () => void
  error: string
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProgressBar step={1} total={4} />
      <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Step 1/4</p>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Let's start with your name and email</h1>
        <p className="text-sm text-zinc-500 mt-1">Let's get you set up. It only takes a minute.</p>
      </div>

      <div className="pt-2 space-y-4">
        <div>
          <Label required>Full Name</Label>
          <Input
            placeholder="Your full name"
            value={data.fullName}
            onChange={e => onChange({ fullName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label required>Email</Label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={data.email}
            onChange={e => onChange({ email: e.target.value })}
            required
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-xl bg-yellow-400 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-500 transition-colors mt-2"
      >
        Continue
      </button>
    </form>
  )
}

function Step2({
  data, onChange, onNext, onBack, error,
}: {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
  error: string
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProgressBar step={2} total={4} />
      <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Step 2/4</p>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Let's start with your Business Details</h1>
        <p className="text-sm text-zinc-500 mt-1">Let's get you set up. It only takes a minute.</p>
      </div>

      <div className="pt-2 space-y-4">
        <div>
          <Label>Fitment Contact Person</Label>
          <Input
            value={data.contactPerson}
            onChange={e => onChange({ contactPerson: e.target.value })}
            placeholder="Contact person name"
          />
        </div>
        <div>
          <Label>Fitment Contact Email</Label>
          <Input
            type="email"
            value={data.contactEmail}
            onChange={e => onChange({ contactEmail: e.target.value })}
            placeholder="contact@yourbusiness.com"
          />
        </div>

        <ConfirmField
          label="Confirm Your Address"
          value={data.address}
          confirmed={data.addressConfirmed}
          onChange={v => onChange({ address: v, addressConfirmed: false })}
          onConfirm={() => onChange({ addressConfirmed: true })}
          placeholder="e.g. 41 Musgrave Rd, Coopers Plains"
        />

        <ConfirmField
          label="Mobile No: (Must be Mobile Number)"
          value={data.mobileNumber}
          confirmed={data.mobileConfirmed}
          onChange={v => onChange({ mobileNumber: v, mobileConfirmed: false })}
          onConfirm={() => onChange({ mobileConfirmed: true })}
          placeholder="04XX XXX XXX"
          type="tel"
        />

        <ConfirmField
          label="Business Number"
          value={data.businessNumber}
          confirmed={data.businessConfirmed}
          onChange={v => onChange({ businessNumber: v, businessConfirmed: false })}
          onConfirm={() => onChange({ businessConfirmed: true })}
          placeholder="ABN or ACN"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-[2] rounded-xl bg-yellow-400 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-500 transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  )
}

function Step3({
  data, onChange, onNext, onBack, error,
}: {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
  onNext: () => void
  onBack: () => void
  error: string
}) {
  function updateHour(idx: number, patch: Partial<WorkingHour>) {
    const updated = data.workingHours.map((h, i) => i === idx ? { ...h, ...patch } : h)
    onChange({ workingHours: updated })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ProgressBar step={3} total={4} />
      <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Step 3/4</p>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Services Capabilities &amp; Hours</h1>
        <p className="text-sm text-zinc-500 mt-1">Select the services you offer and your operating hours.</p>
      </div>

      {/* Fitting Options */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Fitting Options</p>
        <YesNoField
          label="Can you fit Passenger car/4x4/SUV Tyres?"
          value={data.fitsPassengerSuv}
          onChange={v => onChange({ fitsPassengerSuv: v })}
        />
        <YesNoField
          label="Can You Install tyres and wheel packages?"
          value={data.fitsWheelPackages}
          onChange={v => onChange({ fitsWheelPackages: v })}
        />
        <YesNoField
          label="Truck tyres fittings?"
          value={data.fitsTruck}
          onChange={v => onChange({ fitsTruck: v })}
        />
      </div>

      {/* Additional Services */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Additional Services</p>

        {/* Wheel Alignment */}
        <div className={`rounded-lg border p-3 transition-colors ${data.wheelAlignmentAvailable ? 'border-yellow-300 bg-yellow-50' : 'border-zinc-100'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800">Wheel Alignment Available</p>
              <p className="text-xs text-zinc-500">Professional wheel alignment service</p>
              {data.wheelAlignmentAvailable && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-sm text-zinc-600 shrink-0">Pricing</span>
                  <div className="flex items-center border border-zinc-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-yellow-400/30 focus-within:border-yellow-400 w-28">
                    <span className="px-2 text-sm text-zinc-400 select-none">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={data.wheelAlignmentPrice}
                      onChange={e => onChange({ wheelAlignmentPrice: e.target.value })}
                      placeholder="0.00"
                      className="flex-1 w-0 py-1.5 pr-2 text-sm text-zinc-900 bg-white outline-none placeholder:text-zinc-400"
                    />
                  </div>
                </div>
              )}
            </div>
            <Toggle
              checked={data.wheelAlignmentAvailable}
              onChange={v => onChange({ wheelAlignmentAvailable: v })}
            />
          </div>
        </div>

        {/* Mobile Fitting */}
        <div className={`rounded-lg border p-3 transition-colors ${data.mobileFittingAvailable ? 'border-yellow-300 bg-yellow-50' : 'border-zinc-100'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800">Mobile Fitting Available</p>
              <p className="text-xs text-zinc-500">We come to you for fitting</p>
            </div>
            <Toggle
              checked={data.mobileFittingAvailable}
              onChange={v => onChange({ mobileFittingAvailable: v })}
            />
          </div>
        </div>
      </div>

      {/* Working Days & Timings */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Working Days &amp; Timings</p>
        <div className="space-y-2">
          {data.workingHours.map((h, idx) => (
            <div key={h.day} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3">
              <span className="text-sm text-zinc-700">{h.label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id={`closed-${h.day}`}
                  checked={h.isClosed}
                  onChange={e => updateHour(idx, { isClosed: e.target.checked })}
                  className="w-3.5 h-3.5 accent-zinc-600"
                />
                <label htmlFor={`closed-${h.day}`} className="text-xs text-zinc-500">Closed</label>
              </div>
              <select
                disabled={h.isClosed}
                value={h.openTime}
                onChange={e => updateHour(idx, { openTime: e.target.value })}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                disabled={h.isClosed}
                value={h.closeTime}
                onChange={e => updateHour(idx, { closeTime: e.target.value })}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 disabled:bg-zinc-100 disabled:text-zinc-400"
              >
                {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-[2] rounded-xl bg-yellow-400 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-500 transition-colors"
        >
          Continue
        </button>
      </div>
    </form>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-800 mt-0.5">{value || '—'}</p>
    </div>
  )
}

function Step4({
  data, onBack, onSubmit, submitting, error,
}: {
  data: FormData
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
  error: string
}) {
  const openDays = data.workingHours
    .filter(h => !h.isClosed)
    .map(h => h.label.split(' – ')[0].substring(0, 3))

  const firstOpen = data.workingHours.find(h => !h.isClosed)
  const hoursDisplay = firstOpen ? `${firstOpen.openTime} – ${firstOpen.closeTime}` : '—'

  const additionalServices = [
    data.wheelAlignmentAvailable && 'Wheel Alignment',
    data.mobileFittingAvailable  && 'Mobile Fitting',
  ].filter(Boolean)

  return (
    <div className="space-y-5">
      <ProgressBar step={4} total={4} />
      <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide">Step 4/4</p>
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Review &amp; Submit</h1>
        <p className="text-sm text-zinc-500 mt-1">Please review your details before submitting.</p>
      </div>

      <div className="space-y-3">
        {/* Contact Information */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">👤</span>
            <p className="text-sm font-semibold text-zinc-800">Contact Information</p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-zinc-100 pt-3">
            <ReviewRow label="Name"  value={data.fullName} />
            <ReviewRow label="Email" value={data.email} />
          </div>
        </div>

        {/* Business Details */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🏢</span>
            <p className="text-sm font-semibold text-zinc-800">Business Details</p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-dashed border-zinc-100 pt-3">
            <ReviewRow label="Fitment Contact Person" value={data.contactPerson} />
            <ReviewRow label="Contact Email"  value={data.contactEmail} />
            <ReviewRow label="Mobile Number"  value={data.mobileNumber} />
            <ReviewRow label="Business Number" value={data.businessNumber} />
            <div className="col-span-2">
              <ReviewRow label="Business Address" value={data.address} />
            </div>
          </div>
        </div>

        {/* Services & Hours */}
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">🔧</span>
            <p className="text-sm font-semibold text-zinc-800">Services &amp; Hours</p>
          </div>
          <div className="border-t border-dashed border-zinc-100 pt-3 space-y-3">
            {/* Fitting capabilities */}
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Fitting Capabilities</p>
              <div className="flex flex-wrap gap-1.5">
                {data.fitsPassengerSuv  && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">Passenger / 4x4 / SUV</span>}
                {data.fitsWheelPackages && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">Wheel Packages</span>}
                {data.fitsTruck         && <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">Truck Tyres</span>}
                {!data.fitsPassengerSuv && !data.fitsWheelPackages && !data.fitsTruck && (
                  <span className="text-xs text-zinc-400">None selected</span>
                )}
              </div>
            </div>

            {/* Additional services */}
            {additionalServices.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Additional Services</p>
                <div className="flex flex-wrap gap-1.5">
                  {additionalServices.map(s => (
                    <span key={String(s)} className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Hours */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500">Hours</p>
                <p className="text-sm font-medium text-zinc-800">{hoursDisplay}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Days</p>
                <p className="text-sm font-medium text-zinc-800">{openDays.join(', ') || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-[2] rounded-xl bg-yellow-400 py-3 text-sm font-bold text-zinc-900 hover:bg-yellow-500 transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </div>
  )
}

function SuccessScreen() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-zinc-900">Application Submitted!</h2>
      <p className="text-sm text-zinc-500 max-w-sm mx-auto">
        Thank you for applying to join the Tyre Vault Fitter Network. Our team will review your application
        and reach out within 2 business days.
      </p>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OnboardingForm() {
  const [step, setStep]         = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stepError, setStepError] = useState('')

  const [data, setData] = useState<FormData>({
    fullName: '', email: '',
    contactPerson: '', contactEmail: '',
    address: '', addressConfirmed: false,
    mobileNumber: '', mobileConfirmed: false,
    businessNumber: '', businessConfirmed: false,
    fitsPassengerSuv: null, fitsWheelPackages: null, fitsTruck: null,
    wheelAlignmentAvailable: false, wheelAlignmentPrice: '',
    mobileFittingAvailable: false,
    workingHours: DEFAULT_HOURS,
  })

  function patch(p: Partial<FormData>) {
    setData(prev => ({ ...prev, ...p }))
    setStepError('')
  }

  function validateStep1() {
    if (!data.fullName.trim()) return 'Full name is required.'
    if (!data.email.trim() || !data.email.includes('@')) return 'Valid email is required.'
    return ''
  }

  function validateStep2() {
    if (!data.contactPerson.trim()) return 'Contact person name is required.'
    if (!data.contactEmail.trim()) return 'Contact email is required.'
    return ''
  }

  function validateStep3() {
    if (data.fitsPassengerSuv === null && data.fitsWheelPackages === null && data.fitsTruck === null) {
      return 'Please answer at least one fitting option.'
    }
    return ''
  }

  function handleNext() {
    let err = ''
    if (step === 1) err = validateStep1()
    if (step === 2) {
      err = validateStep2()
      // Auto-fill step 2 from step 1 if blank
      if (!data.contactPerson) patch({ contactPerson: data.fullName })
      if (!data.contactEmail)  patch({ contactEmail:  data.email })
    }
    if (step === 3) err = validateStep3()
    if (err) { setStepError(err); return }
    setStepError('')
    setStep(s => s + 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setStepError('')
    try {
      const payload = {
        fullName:      data.fullName,
        email:         data.email,
        contactPerson: data.contactPerson,
        contactEmail:  data.contactEmail,
        address:       data.address || undefined,
        mobileNumber:  data.mobileNumber || undefined,
        businessNumber: data.businessNumber || undefined,
        fitsPassengerSuv:   data.fitsPassengerSuv  ?? false,
        fitsWheelPackages:  data.fitsWheelPackages  ?? false,
        fitsTruck:          data.fitsTruck           ?? false,
        wheelAlignmentAvailable: data.wheelAlignmentAvailable,
        wheelAlignmentPrice: data.wheelAlignmentPrice ? parseFloat(data.wheelAlignmentPrice) : undefined,
        mobileFittingAvailable: data.mobileFittingAvailable,
        workingHours: data.workingHours.map(h => ({
          day:        h.day,
          is_closed:  h.isClosed,
          open_time:  h.openTime,
          close_time: h.closeTime,
        })),
      }

      const res = await fetch(`${API}/api/fitter/applications`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = await res.json()
        setStepError(j.message ?? 'Submission failed. Please try again.')
        return
      }
      setSubmitted(true)
    } finally { setSubmitting(false) }
  }

  // Auto-fill step 2 name/email from step 1 when entering step 2
  function goToStep2() {
    setData(prev => ({
      ...prev,
      contactPerson: prev.contactPerson || prev.fullName,
      contactEmail:  prev.contactEmail  || prev.email,
    }))
    setStep(2)
  }

  const stepProps = { data, onChange: patch, error: stepError }

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          {/* Logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
            </div>
            <span className="font-bold text-zinc-900 tracking-wide text-sm">TYRE VAULT</span>
            <span className="text-xs text-zinc-400 ml-1">TYRES AND AUTOPARTS</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start py-12 px-4">
        <h1 className="text-3xl font-bold text-zinc-900 mb-8">Tyre Vault Onboarding</h1>

        <div className="w-full max-w-5xl grid grid-cols-[360px_1fr] gap-6">
          {/* Left: Info panel */}
          <div className="shrink-0">
            <InfoPanel />
          </div>

          {/* Right: Form steps */}
          <div className="bg-white rounded-xl border border-zinc-200 p-8">
            {submitted ? (
              <SuccessScreen />
            ) : step === 1 ? (
              <Step1 {...stepProps} onNext={() => { const e = validateStep1(); if (e) { setStepError(e); return } goToStep2() }} />
            ) : step === 2 ? (
              <Step2 {...stepProps} onNext={handleNext} onBack={() => setStep(1)} />
            ) : step === 3 ? (
              <Step3 {...stepProps} onNext={handleNext} onBack={() => setStep(2)} />
            ) : (
              <Step4 data={data} onBack={() => setStep(3)} onSubmit={handleSubmit} submitting={submitting} error={stepError} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
