'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FitmentCentresClient from '@/components/admin/fitment-centres/FitmentCentresClient'
import { useAdminFitmentCentres } from '@/lib/query/hooks'
import { BoxSpinner } from '@/components/ui/table-loader'

export default function AdminFittersCentrePage() {
  const { data, isPending } = useAdminFitmentCentres()
  const [token, setToken] = useState('')

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '')
    })
  }, [])

  if (isPending || !token) return <BoxSpinner />

  return (
    <FitmentCentresClient
      initialCentres={data?.data ?? []}
      initialTotal={data?.total ?? 0}
      accessToken={token}
    />
  )
}
