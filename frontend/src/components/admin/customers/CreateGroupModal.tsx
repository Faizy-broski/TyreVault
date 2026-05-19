'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BACKEND_API_URL, createBackendHeaders, readBackendError } from '@/lib/backend-api'
import { toastSuccess, toastError } from '@/lib/toast'

type Props = {
  accessToken: string
  onClose: () => void
}

export default function CreateGroupModal({ accessToken, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = (new FormData(e.currentTarget).get('name') as string).trim()
    if (!name) { toastError('Group name is required'); return }

    try {
      const res = await fetch(`${BACKEND_API_URL}/api/admin/customers/groups`, {
        method: 'POST',
        headers: createBackendHeaders(accessToken, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        throw new Error(await readBackendError(res, 'Failed to create group'))
      }
      toastSuccess('Group created')
      startTransition(() => router.refresh())
      onClose()
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to create group')
    }
  }

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="p-0 gap-0 rounded-2xl shadow-xl ring-0 bg-white sm:max-w-sm" showCloseButton={false}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <DialogTitle className="text-base font-semibold text-zinc-900">Create Customer Group</DialogTitle>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </Button>
          </DialogClose>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-3">
            <Label htmlFor="groupName" className="block text-sm font-medium text-zinc-700 mb-1">
              Group Name
            </Label>
            <Input
              id="groupName"
              name="name"
              autoFocus
              placeholder="e.g. Wholesale, Retail, VIP"
              className="rounded-lg border-zinc-300 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="px-4 py-2 text-sm text-zinc-600 border-zinc-300 rounded-lg hover:bg-zinc-50">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-zinc-900 bg-primary rounded-lg hover:bg-primary/90"
            >
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
