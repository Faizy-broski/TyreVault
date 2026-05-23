'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') ?? '/'

  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    const role = (profile as any)?.role
    if (role === 'super_admin') {
      router.push('/admin/dashboard')
    } else if (role === 'fitter') {
      router.push('/fitter/dashboard')
    } else {
      router.push(redirect)
    }
    router.refresh()
  }

  const forgotHref = email.trim()
    ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
    : '/forgot-password'

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
      <Link
      href="/"
      className="mb-6 flex items-center justify-center transition-opacity hover:opacity-80"
    >
      <img
        src="/logo_dark.svg"
        alt="Tyre Vault"
        className="h-14 w-auto"
      />
    </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Sign in to Tyre Vault
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <Link
            href={forgotHref}
            className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors mt-1"
          >
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
