import type { ReactNode } from 'react'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import FooterSection from '@/components/home/FooterSection'
import CartDrawer from '@/components/storefront/CartDrawer'
import { Toaster } from '@/components/ui/sonner'

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StorefrontShell />
      <main className="min-h-screen bg-zinc-50">{children}</main>
      <FooterSection />
      <CartDrawer />
      <Toaster />
    </>
  )
}

