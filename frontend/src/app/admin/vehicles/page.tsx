import { createClient } from '@/lib/supabase/server'
import VehiclesClient from '@/components/admin/vehicles/VehiclesClient'
import type { AdminVehicle } from '@/types/admin.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vehicles — Admin' }

const API   = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const LIMIT = 50

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; make?: string; page?: string }>
}) {
  const { search = '', make = '', page: pageStr = '1' } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  let vehicles: AdminVehicle[] = []
  let makes: string[]          = []
  let total = 0

  if (token) {
    const vehiclesQs = new URLSearchParams({
      search,
      make,
      page: String(page),
      limit: String(LIMIT),
    })
    try {
      const [vehiclesRes, makesRes] = await Promise.all([
        fetch(`${API}/api/admin/vehicles?${vehiclesQs}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        fetch(`${API}/api/admin/vehicles/makes`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
      ])
      if (vehiclesRes.ok) {
        const json = await vehiclesRes.json()
        vehicles = json.data  ?? []
        total    = json.total ?? 0
      }
      if (makesRes.ok) makes = await makesRes.json()
    } catch { /* render empty state */ }
  }

  return (
    <VehiclesClient
      vehicles={vehicles}
      makes={makes}
      total={total}
      page={page}
      search={search}
      make={make}
    />
  )
}
