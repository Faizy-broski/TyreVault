'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb'
import type { CustomerGroup, CustomerListItem } from '@/types/admin.types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

type GroupWithMembers = CustomerGroup & { members: CustomerListItem[] }

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
      isGuest
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-green-200 bg-green-50 text-green-700'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isGuest ? 'Guest' : 'Registered'}
    </span>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CustomerGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()

  const [group, setGroup]     = useState<GroupWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    document.title = group ? `${group.group_name} | Tyre Vault` : 'Customer Group | Tyre Vault'
  }, [group])

  useEffect(() => {
    if (!groupId) return
    let cancelled = false
    async function load() {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const tok = session?.access_token ?? ''

        const res = await fetch(`${API}/api/admin/customers/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `API returned ${res.status}`)
        }
        const json = await res.json()
        if (!cancelled) setGroup(json.group)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load group')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [groupId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (error || !group) {
    return (
      <div className="p-6">
        <AdminBreadcrumb crumbs={[{ label: 'Customers', href: '/admin/customers' }, { label: 'Group' }]} />
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ?? 'Group not found.'}
        </div>
      </div>
    )
  }

  const members = group.members ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <AdminBreadcrumb crumbs={[
          { label: 'Customers', href: '/admin/customers' },
          { label: group.group_name },
        ]} />
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">{group.group_name}</h1>
          <button type="button" aria-label="More options" className="p-1.5 text-zinc-400 hover:text-zinc-700">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center border-t border-zinc-100 pt-3">
          <span className="w-32 text-sm text-zinc-500">Customers</span>
          <span className="text-sm font-medium text-zinc-800">{group.customer_count}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900">Customers</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500">
              + Account
            </button>
            <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500">
              + Created
            </button>
            <div className="relative ml-2">
              <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input placeholder="Search" className="w-36 rounded-lg border border-zinc-200 py-1 pl-7 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-zinc-400">
                  No customers in this group yet.
                </td>
              </tr>
            ) : (
              members.map(member => (
                <tr key={member.customer_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${member.customer_id}`} className="text-zinc-800 hover:underline">
                      {member.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {[member.first_name, member.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AccountBadge isGuest={!member.profile_id} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{fmt(member.created_at)}</td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-zinc-400 hover:text-zinc-700">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-500">
          <span>1 — {members.length} of {group.customer_count} results</span>
          <div className="flex items-center gap-3">
            <span>1 of 1 pages</span>
            <div className="flex gap-1">
              <span className="cursor-not-allowed rounded border border-zinc-200 px-2 py-1 text-zinc-300">Prev</span>
              <span className="cursor-not-allowed rounded border border-zinc-200 px-2 py-1 text-zinc-300">Next</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
