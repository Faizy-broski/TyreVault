import { Suspense } from 'react'
import ProfileClient from '@/components/storefront/account/ProfileClient'

export default function AccountProfilePage() {
  return (
    <Suspense>
      <ProfileClient />
    </Suspense>
  )
}
