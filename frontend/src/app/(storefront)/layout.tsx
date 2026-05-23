import type { ReactNode } from 'react'
import StorefrontShell from '@/components/storefront/StorefrontShell'
import FooterSection from '@/components/home/FooterSection'
import CartDrawer from '@/components/storefront/CartDrawer'

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StorefrontShell />
      <main className="min-h-screen bg-zinc-50">{children}</main>
      <FooterSection />
      <CartDrawer />
    </>
  )
}
