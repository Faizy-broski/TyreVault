'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MoreVertical, Search, SlidersHorizontal, Check, X } from 'lucide-react'
import CreateGroupModal from './CreateGroupModal'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import { toastSuccess, toastError } from '@/lib/toast'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CustomerGroup } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

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

  const [localGroups, setLocalGroups] = useState<CustomerGroup[]>(groups)
  useEffect(() => { setLocalGroups(groups) }, [groups])

  const [editingId,  setEditingId]    = useState<string | null>(null)
  const [editName,   setEditName]     = useState('')
  const [renaming,   setRenaming]     = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  function startEdit(group: CustomerGroup) {
    setEditingId(group.group_id)
    setEditName(group.group_name)
  }

  async function saveRename(groupId: string) {
    if (!editName.trim()) return
    setRenaming(true)
    try {
      const res = await fetch(`${API}/api/admin/customers/groups/${groupId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to rename group')
      }
      setLocalGroups(prev => prev.map(g =>
        g.group_id === groupId ? { ...g, group_name: editName.trim(), updated_at: new Date().toISOString() } : g
      ))
      setEditingId(null)
      toastSuccess('Group renamed')
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to rename')
    } finally { setRenaming(false) }
  }

  async function handleDelete(group: CustomerGroup) {
    setDeletingId(group.group_id)
    try {
      const res = await fetch(`${API}/api/admin/customers/groups/${group.group_id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to delete group')
      }
      setLocalGroups(prev => prev.filter(g => g.group_id !== group.group_id))
      toastSuccess(`Group "${group.group_name}" deleted`)
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete group')
    } finally { setDeletingId(null) }
  }

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
    <div className="p-4 sm:p-6">
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Customer Group</h1>
        <Button
          type="button"
          onClick={openCreate}
          className="h-auto rounded-lg bg-primary px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-primary/90"
        >
          Create
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-zinc-100 bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Name
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                <div className="flex items-center gap-1">
                  Customers
                  <span className="text-zinc-400">↓</span>
                </div>
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Created
              </TableHead>
              <TableHead className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                Updated
              </TableHead>
              <TableHead className="w-10 px-4 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-zinc-100">
            {localGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 mx-auto">
                    <svg className="w-10 h-10 text-zinc-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <p className="text-sm font-medium text-zinc-400">{search ? `No groups matching "${search}"` : 'No customer groups yet.'}</p>
                    {!search && <p className="text-xs text-zinc-300">Click &quot;Create&quot; to add your first group.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              localGroups.map((group) => (
                <TableRow key={group.group_id} className={`even:bg-zinc-50/40 hover:bg-amber-50/30 transition-colors duration-150 ${deletingId === group.group_id ? 'opacity-40 pointer-events-none' : ''}`}>
                  <TableCell className="px-4 py-3 font-medium text-zinc-800">
                    {editingId === group.group_id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveRename(group.group_id); if (e.key === 'Escape') setEditingId(null) }}
                          className="h-7 w-48 rounded border-zinc-300 px-2 py-1 text-sm focus:border-primary focus:ring-primary/20"
                          disabled={renaming}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Save name"
                          onClick={() => saveRename(group.group_id)}
                          disabled={renaming || !editName.trim()}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Cancel rename"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Link
                        href={`/admin/customers/groups/${group.group_id}`}
                        className="hover:underline"
                      >
                        {group.group_name}
                      </Link>
                    )}
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-zinc-400 hover:text-zinc-700"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => startEdit(group)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(group)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
