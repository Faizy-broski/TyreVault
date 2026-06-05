'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toastError } from '@/lib/toast'
import { toast } from 'sonner'
import type { MappingParams } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface Props {
  params:      MappingParams
  accessToken: string
  onSaved:     (updated: MappingParams) => void
}

export default function MappingParamsPanel({ params: initial, accessToken, onSaved }: Props) {
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState<MappingParams>(initial)
  const [saving, setSaving] = useState(false)

  const headers = {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  // Weights must total 100
  const weightTotal = form.size + form.brand + form.pattern + form.load_speed
  const weightsValid = weightTotal === 100

  function set(key: keyof MappingParams, raw: string) {
    const val = parseInt(raw, 10)
    if (!Number.isNaN(val)) setForm(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    if (!weightsValid) {
      toastError('Weights must total exactly 100%')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/settings/mapping_parameters`, {
        method:  'PATCH',
        headers,
        body:    JSON.stringify({ value: form }),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      toast.success('Mapping parameters saved — takes effect on next import')
      onSaved(form)
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to save parameters')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <span>Mapping Parameters</span>
        {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-zinc-100 space-y-5">
          <p className="text-xs text-zinc-500 pt-3">
            Weights must total 100%. Thresholds apply to the next import — already-processed rows are unaffected.
          </p>

          {/* Weights */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-2">Score Weights</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([ ['size', 'Size Match'], ['brand', 'Brand'], ['pattern', 'Pattern'], ['load_speed', 'Load / Speed'] ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-zinc-500 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 pr-7 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className={`mt-1.5 text-xs font-medium ${weightsValid ? 'text-green-600' : 'text-red-500'}`}>
              Total: {weightTotal}% {weightsValid ? '✓' : `— needs to be 100%`}
            </p>
          </div>

          {/* Thresholds */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide mb-2">Confidence Thresholds</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Auto-map above</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.auto_threshold}
                    onChange={e => set('auto_threshold', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 pr-7 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">Requires Auto Map + Sync to be ON</p>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Review queue above</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.review_threshold}
                    onChange={e => set('review_threshold', e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 pr-7 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">%</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">Below this is rejected</p>
              </div>
            </div>
          </div>

          <Button
            onClick={save}
            disabled={saving || !weightsValid}
            size="sm"
            className="gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving…' : 'Save Parameters'}
          </Button>
        </div>
      )}
    </div>
  )
}
