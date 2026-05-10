import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AuthRedirect from '@/components/AuthRedirect'

export default async function RootPage() {
  // Server-side: redirect already-authenticated users to their portal
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile as { role?: string } | null)?.role
    if (role === 'super_admin') redirect('/admin/dashboard')
    if (role === 'fitter')      redirect('/fitter/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      {/* Handles invite hash tokens — client-side auth state listener */}
      <AuthRedirect />

      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400 mb-4">
          Development
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Tyre Vault</h1>
        <p className="mt-2 text-zinc-400 text-sm">Select a portal to continue</p>
      </div>

      <div className="grid gap-4 w-full max-w-2xl sm:grid-cols-3">

        {/* Admin Portal */}
        <div className="rounded-2xl bg-zinc-900 ring-1 ring-white/5 p-5 flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">Admin</span>
            <h2 className="mt-2 text-base font-semibold text-white">Admin Portal</h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">Manage orders, products, customers, suppliers & fitment centres</p>
          </div>
          <div className="mt-auto">
            <Link
              href="/login?redirect=/admin/dashboard"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-white transition-colors bg-blue-600 hover:bg-blue-700"
            >
              Sign in as Admin
            </Link>
          </div>
        </div>

        {/* Fitter Portal */}
        <div className="rounded-2xl bg-zinc-900 ring-1 ring-white/5 p-5 flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Fitter</span>
            <h2 className="mt-2 text-base font-semibold text-white">Fitter Portal</h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">View job schedule, manage earnings, update job statuses</p>
          </div>
          <div className="flex flex-col gap-2 mt-auto">
            <Link
              href="/login?redirect=/fitter/dashboard"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-white transition-colors bg-emerald-600 hover:bg-emerald-700"
            >
              Sign in as Fitter
            </Link>
            <Link
              href="/fitter/onboarding"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-800 hover:border-emerald-600"
            >
              Apply as Fitter
            </Link>
          </div>
        </div>

        {/* Storefront */}
        <div className="rounded-2xl bg-zinc-900 ring-1 ring-white/5 p-5 flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">Coming soon</span>
            <h2 className="mt-2 text-base font-semibold text-white">Storefront</h2>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">Customer-facing tyre shop (in development)</p>
          </div>
          <div className="mt-auto">
            <Link
              href="/tyres"
              className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-white transition-colors bg-zinc-600 hover:bg-zinc-700"
            >
              View Storefront
            </Link>
          </div>
        </div>

      </div>

      <p className="mt-8 text-xs text-zinc-600">
        Backend API: <span className="text-zinc-500">localhost:3001</span>
        &nbsp;&middot;&nbsp;
        Supabase: <span className="text-zinc-500">connected</span>
      </p>
    </div>
  )
}
