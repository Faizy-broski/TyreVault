'use client'

import { Sheet } from '@/components/ui/sheet'
import BrandForm, { EMPTY_BRAND_FORM } from './BrandForm'

interface Props {
  open:    boolean
  onClose: () => void
  onSaved: () => void
}

export function BrandAddSheet({ open, onClose, onSaved }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="New Brand" width="w-full max-w-2xl">
      <BrandForm initial={EMPTY_BRAND_FORM} onSuccess={onSaved} onCancel={onClose} />
    </Sheet>
  )
}
