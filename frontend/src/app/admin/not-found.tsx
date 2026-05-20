import Link from 'next/link'
import { Home, Search } from 'lucide-react'
import BackButton from '@/components/BackButton'

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-4rem)] px-4 sm:px-6 text-center">
      {/* Big 404 */}
      <div className="relative mb-6 select-none">
        <p className="text-[9rem] font-black leading-none text-zinc-100 tracking-tighter">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15">
            <Search className="w-7 h-7 text-primary" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Page not found</h1>
      <p className="text-sm text-zinc-500 max-w-xs mb-8">
        The admin page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home className="w-4 h-4" />
          Go to Dashboard
        </Link>
        <BackButton />
      </div>

      <p className="mt-10 text-xs text-zinc-400">
        If you think this is a mistake,{' '}
        <span className="text-primary">contact support</span>.
      </p>
    </div>
  )
}
