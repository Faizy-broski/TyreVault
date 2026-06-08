import type { ReactNode } from 'react'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import FooterSection from '@/components/home/FooterSection'
import CartDrawer from '@/components/storefront/CartDrawer'
import { Toaster } from '@/components/ui/sonner'
import { ReactQueryProvider } from '@/lib/query/client'

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StorefrontShell />
      <main className="min-h-screen bg-zinc-50 pt-[104px]">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </main>
      <FooterSection />
      <CartDrawer />
      <Toaster />
    </>
  )
}

