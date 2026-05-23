'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError } from '@/lib/toast'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-900 font-medium">{String(value)}</p>
    </div>
  )
}

function YesNo({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className={`text-xs font-semibold ${value ? 'text-green-600' : 'text-zinc-400'}`}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  )
}

interface Props {
  application: Record<string, unknown>
  accessToken: string
}

function ResendInviteButton({ appId, accessToken }: { appId: string; accessToken: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

  async function resend() {
    setState('loading')
    try {
      const res = await fetch(`${API}/api/fitter/applications/${appId}/resend-invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <button
      onClick={resend}
      disabled={state === 'loading' || state === 'sent'}
      className="mt-3 text-xs font-medium text-green-700 underline underline-offset-2 hover:text-green-900 disabled:opacity-50"
    >
      {state === 'loading' ? 'Sending…' : state === 'sent' ? '✓ Invite sent' : state === 'error' ? '✕ Failed — try again' : 'Resend invite email'}
    </button>
  )
}

export default function ApplicationReviewClient({ application: initial, accessToken }: Props) {
  const router = useRouter()
  const [app, setApp]         = useState(initial)
  const [notes, setNotes]     = useState(String(initial.admin_notes ?? ''))
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  const status = String(app.status ?? 'pending')
  const isDone = status === 'approved' || status === 'rejected'

  async function decide(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      const res = await fetch(`${API}/api/fitter/applications/${app.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: action === 'approve' ? 'approved' : 'rejected',
          adminNotes: notes,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toastSuccess(action === 'approve' ? 'Application approved' : 'Application rejected')
      setApp({ ...app, status: action === 'approve' ? 'approved' : 'rejected', admin_notes: notes })
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  const wh = Array.isArray(app.working_hours) ? app.working_hours as Record<string, unknown>[] : []

  return (
    <div className=" ">
      {/* Back */}


      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{String(app.full_name ?? '')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{String(app.email ?? '')}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status] ?? 'bg-zinc-100 text-zinc-700'}`}>
          {status}
        </span>
      </div>

      <div className="space-y-4">

        {/* Contact */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Contact Details</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Person"   value={app.contact_person} />
            <Field label="Contact Email"    value={app.contact_email} />
            <Field label="Mobile Number"    value={app.mobile_number} />
            <Field label="Business Number"  value={app.business_number} />
            <Field label="Address"          value={app.address} />
            <Field label="Submitted"        value={app.submitted_at ? new Date(String(app.submitted_at)).toLocaleString('en-AU') : ''} />
          </div>
        </div>

        {/* Services */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Services Offered</p>
          <YesNo label="Fits Passenger / SUV"  value={app.fits_passenger_suv} />
          <YesNo label="Fits Wheel Packages"   value={app.fits_wheel_packages} />
          <YesNo label="Fits Truck"            value={app.fits_truck} />
          <YesNo label="Wheel Alignment"       value={app.wheel_alignment_available} />
          {!!app.wheel_alignment_available && !!app.wheel_alignment_price && (
            <p className="text-xs text-zinc-500 mt-1 pl-1">Pricing: ${String(app.wheel_alignment_price)}</p>
          )}
          <YesNo label="Mobile Fitting"        value={app.mobile_fitting_available} />
        </div>

        {/* Working Hours */}
        {wh.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Working Hours</p>
            <div className="space-y-1">
              {wh.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span className="text-zinc-700 capitalize">{String(h.day ?? '').replace('_', ' – ')}</span>
                  {h.is_closed
                    ? <span className="text-zinc-400">Closed</span>
                    : <span className="text-zinc-900">{String(h.open_time)} – {String(h.close_time)}</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision */}
        {!isDone && (
          <div className="bg-white rounded-xl border border-zinc-200 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Decision</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Admin notes (optional)..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => decide('approve')}
                disabled={loading !== null}
                className="flex-1 rounded-lg bg-green-600 hover:bg-green-700 text-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading === 'approve' ? 'Approving…' : '✓ Approve'}
              </button>
              <button
                onClick={() => decide('reject')}
                disabled={loading !== null}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loading === 'reject' ? 'Rejecting…' : '✕ Reject'}
              </button>
            </div>
          </div>
        )}

        {isDone && (
          <div className={`rounded-xl border p-4 ${status === 'approved' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-sm font-medium ${status === 'approved' ? 'text-green-800' : 'text-red-800'}`}>
              Application {status}. {notes && <span className="font-normal">{notes}</span>}
            </p>
            {status === 'approved' && (
              <ResendInviteButton appId={String(app.id)} accessToken={accessToken} />
            )}
          </div>
        )}

      </div>
    </div>
  )
}
