'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CreateGroupModal from './CreateGroupModal'
import type { CustomerGroup } from '@/types/admin.types'

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('en-AU', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

type Props = {
  groups: CustomerGroup[]
  total: number
  totalPages: number
  page: number
  search: string
}

export default function CustomerGroupsClient({ groups, total, totalPages, page, search }: Props) {
  const router        = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [localSearch, setLocalSearch] = useState(search)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const url = `/admin/customers/groups?search=${encodeURIComponent(localSearch)}&page=1`
    router.push(url)
  }

  return (
    <div className="p-6">
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Customer Group</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Create
        </button>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:border-zinc-500 transition-colors">
            + Account
          </button>
          <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600 hover:border-zinc-500 transition-colors">
            + Created
          </button>
        </div>
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search groups..."
              className="pl-8 pr-4 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 w-48"
            />
          </div>
          <button type="submit" className="p-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 text-zinc-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1">
                  Customers
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Updated</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-400">
                  {search ? `No groups matching "${search}"` : 'No customer groups yet. Click "Create" to add one.'}
                </td>
              </tr>
            ) : (
              groups.map(g => (
                <tr key={g.group_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">
                    <Link href={`/admin/customers/groups/${g.group_id}`} className="hover:underline">
                      {g.group_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{g.customer_count}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmtDateTime(g.created_at)}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{fmtDateTime(g.updated_at)}</td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-zinc-400 hover:text-zinc-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50 text-xs text-zinc-500">
          <span>1 — {groups.length} of {total} results</span>
          <div className="flex items-center gap-3">
            <span>{page} of {totalPages} pages</span>
            <div className="flex gap-1">
              {page > 1 ? (
                <Link href={`/admin/customers/groups?page=${page - 1}${search ? `&search=${search}` : ''}`}
                  className="px-2 py-1 rounded border border-zinc-300 hover:bg-white transition-colors">
                  Prev
                </Link>
              ) : (
                <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Prev</span>
              )}
              {page < totalPages ? (
                <Link href={`/admin/customers/groups?page=${page + 1}${search ? `&search=${search}` : ''}`}
                  className="px-2 py-1 rounded border border-zinc-300 hover:bg-white transition-colors">
                  Next
                </Link>
              ) : (
                <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Next</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
