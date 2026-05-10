import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { CustomerListItem, CustomerGroup } from '@/types/admin.types'

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('customer_groups').select('group_name').eq('group_id', groupId).single()
  return { title: (data as unknown as { group_name: string } | null)?.group_name ?? 'Customer Group' }
}

function AccountBadge({ isGuest }: { isGuest: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${
      isGuest ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-green-500'}`} />
      {isGuest ? 'Guest' : 'Registered'}
    </span>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function CustomerGroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase    = await createClient()

  const [groupRes, membersRes] = await Promise.all([
    supabase
      .from('customer_groups')
      .select('group_id, group_name, customer_count, created_at, updated_at')
      .eq('group_id', groupId)
      .single(),

    supabase
      .from('customer_group_members')
      .select(`
        customers (
          customer_id, email, first_name, last_name,
          company, phone, created_at, profile_id
        )
      `)
      .eq('group_id', groupId)
      .order('added_at', { ascending: false })
      .limit(20),
  ])

  const groupData = groupRes as unknown as { data: CustomerGroup | null; error: unknown }
  if (groupRes.error || !groupData.data) notFound()

  const group   = groupData.data!
  const members = ((membersRes as unknown as { data: any[] | null }).data ?? [])
    .map((m: any) => m.customers)
    .filter(Boolean) as CustomerListItem[]

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-zinc-500 mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        <Link href="/admin/customers" className="hover:text-zinc-900">Customers</Link>
        <span>›</span>
        <span className="text-zinc-900 font-medium">{group.group_name}</span>
      </div>

      {/* Group header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-zinc-900">{group.group_name}</h1>
          <button className="p-1.5 text-zinc-400 hover:text-zinc-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center border-t border-zinc-100 pt-3">
          <span className="text-sm text-zinc-500 w-32">Customers</span>
          <span className="text-sm font-medium text-zinc-800">{group.customer_count}</span>
        </div>
      </div>

      {/* Members table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-sm font-semibold text-zinc-900">Customers</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500">
              + Account
            </button>
            <button className="flex items-center gap-1 rounded-full border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:border-zinc-500">
              + Created
            </button>
            <div className="relative ml-2">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input placeholder="Search" className="pl-7 pr-3 py-1 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 w-36" />
            </div>
            <button className="p-1 text-zinc-400 hover:text-zinc-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
                <div className="flex items-center gap-1">
                  Name
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Account</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              <th className="px-4 py-3 w-10" />
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
              members.map(c => (
                <tr key={c.customer_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.customer_id}`} className="text-zinc-800 hover:underline">
                      {c.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AccountBadge isGuest={!c.profile_id} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{fmt(c.created_at)}</td>
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
          <span>1 — {members.length} of {group.customer_count} results</span>
          <div className="flex items-center gap-3">
            <span>1 of 1 pages</span>
            <div className="flex gap-1">
              <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Prev</span>
              <span className="px-2 py-1 rounded border border-zinc-200 text-zinc-300 cursor-not-allowed">Next</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
