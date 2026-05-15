'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MoreVertical, Search, SlidersHorizontal } from 'lucide-react'
import CreateGroupModal from './CreateGroupModal'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CustomerGroup } from '@/types/admin.types'

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

type Props = {
  accessToken: string
  groups: CustomerGroup[]
  total: number
  totalPages: number
  page: number
  search: string
}

export default function CustomerGroupsClient({
  accessToken,
  groups,
  total,
  totalPages,
  page,
  search,
}: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const pathname    = usePathname()
  const showCreate  = searchParams.get('modal') === 'create'
  const [localSearch, setLocalSearch] = useState(search)

  function openCreate() {
    const p = new URLSearchParams(searchParams.toString())
    p.set('modal', 'create')
    router.push(`${pathname}?${p}`)
  }

  function closeModal() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('modal')
    const qs = p.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }
  const startResult = total === 0 ? 0 : (page - 1) * 20 + 1
  const endResult = total === 0 ? 0 : (page - 1) * 20 + groups.length

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(
      `/admin/customers/groups?search=${encodeURIComponent(localSearch)}&page=1`,
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <AdminBreadcrumb
          crumbs={[
            { label: 'Customers', href: '/admin/customers' },
            { label: 'Groups' },
          ]}
        />
      </div>

      {showCreate && (
        <CreateGroupModal
          accessToken={accessToken}
          onClose={closeModal}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Customer Group</h1>
        <Button
          type="button"
          onClick={openCreate}
          className="h-auto rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90"
        >
          Create
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-auto rounded-full border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:border-zinc-500"
          >
            + Account
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto rounded-full border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:border-zinc-500"
          >
            + Created
          </Button>
        </div>
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-48 rounded-lg border-zinc-300 pl-8 pr-4 text-sm focus:border-primary focus:ring-primary/30"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="icon-sm"
            className="border-zinc-300 text-zinc-500"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                Name
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1">
                  Customers
                  <span className="text-zinc-400">↓</span>
                </div>
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                Created
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                Updated
              </TableHead>
              <TableHead className="w-10 px-4 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-zinc-400"
                >
                  {search
                    ? `No groups matching "${search}"`
                    : 'No customer groups yet. Click "Create" to add one.'}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.group_id} className="hover:bg-zinc-50">
                  <TableCell className="px-4 py-3 font-medium text-zinc-800">
                    <Link
                      href={`/admin/customers/groups/${group.group_id}`}
                      className="hover:underline"
                    >
                      {group.group_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-zinc-600">
                    {group.customer_count}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {fmtDateTime(group.created_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {fmtDateTime(group.updated_at)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
          <span>
            {startResult} — {endResult} of {total} results
          </span>
          <div className="flex items-center gap-3">
            <span>
              {page} of {totalPages} pages
            </span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-auto rounded border-zinc-300 px-2 py-1 text-xs hover:bg-white"
                >
                  <Link
                    href={`/admin/customers/groups?page=${page - 1}${search ? `&search=${search}` : ''}`}
                  >
                    Prev
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-auto rounded border-zinc-200 px-2 py-1 text-xs text-zinc-300"
                >
                  Prev
                </Button>
              )}
              {page < totalPages ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-auto rounded border-zinc-300 px-2 py-1 text-xs hover:bg-white"
                >
                  <Link
                    href={`/admin/customers/groups?page=${page + 1}${search ? `&search=${search}` : ''}`}
                  >
                    Next
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-auto rounded border-zinc-200 px-2 py-1 text-xs text-zinc-300"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
