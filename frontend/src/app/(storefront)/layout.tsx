import type { ReactNode } from 'react'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import CartDrawer from '@/components/storefront/CartDrawer'

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StorefrontHeader />
      <main className="min-h-screen bg-zinc-50">{children}</main>
      <StorefrontFooter />
      <CartDrawer />
    </>
  )
}
