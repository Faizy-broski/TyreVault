'use client'

import { useState } from 'react'
import CreateCustomerModal from './CreateCustomerModal'

export default function CreateCustomerButton({ accessToken }: { accessToken: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-zinc-900 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Create Customer
      </button>
      {open && (
        <CreateCustomerModal
          accessToken={accessToken}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
