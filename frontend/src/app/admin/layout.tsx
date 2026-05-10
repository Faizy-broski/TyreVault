import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import type { ProfileRow } from '@/types/admin.types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/admin/products')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if ((profile as unknown as ProfileRow | null)?.role !== 'super_admin') redirect('/')

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <AdminSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
