'use client'

import { useState, useEffect } from 'react'
import { toastError } from '@/lib/toast'

export function BoolToggle({ initial, onToggle }: {
  initial:  boolean
  onToggle: (next: boolean) => Promise<void>
}) {
  const [value, setValue] = useState(initial)
  const [busy,  setBusy]  = useState(false)

  useEffect(() => { setValue(initial) }, [initial])

  async function set(next: boolean) {
    if (next === value || busy) return
    setValue(next)
    setBusy(true)
    try {
      await onToggle(next)
    } catch {
      setValue(!next)
      toastError('Update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`inline-flex rounded-lg border border-zinc-200 overflow-hidden text-xs font-semibold ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <button type="button" onClick={() => set(true)}
        className={`px-3 py-1 transition-colors ${value ? 'bg-green-500 text-white' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}>
        Yes
      </button>
      <button type="button" onClick={() => set(false)}
        className={`px-3 py-1 transition-colors border-l border-zinc-200 ${!value ? 'bg-red-500 text-white' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}>
        No
      </button>
    </div>
  )
}
