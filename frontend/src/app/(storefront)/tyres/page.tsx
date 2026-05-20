import { searchTyres } from '@/lib/typesense'
import TyresListingClient from '@/components/storefront/TyresListingClient'

export const metadata = {
  title: 'Shop Tyres',
  description: 'Browse our full range of tyres. Filter by size, brand, and more.',
}

interface Props {
  searchParams: Promise<{
    q?: string
    width?: string
    profile?: string
    rim_size?: string
    brand?: string | string[]
    runflat?: string
    in_stock?: string
    application_type?: string
    page?: string
    sort?: string
  }>
}

export default async function TyresPage({ searchParams }: Props) {
  const params = await searchParams

  const brands = params.brand
    ? Array.isArray(params.brand) ? params.brand : [params.brand]
    : undefined

  let result = null
  let errorMsg: string | null = null

  try {
    result = await searchTyres({
      q:                params.q,
      width:            params.width    ? Number(params.width)    : undefined,
      profile:          params.profile  ? Number(params.profile)  : undefined,
      rim_size:         params.rim_size ? Number(params.rim_size) : undefined,
      brand:            brands,
      runflat:          params.runflat    === 'true' ? true : params.runflat === 'false' ? false : undefined,
      in_stock:         params.in_stock  === 'true' ? true : undefined,
      application_type: params.application_type,
      page:             params.page ? Number(params.page) : 1,
      sort:             params.sort as 'price_asc' | 'price_desc' | 'stock_desc' | undefined,
    })
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Search unavailable'
  }

  return (
    <TyresListingClient
      initialResult={result}
      initialError={errorMsg}
      initialParams={{
        q:                params.q ?? '',
        width:            params.width    ? Number(params.width)    : undefined,
        profile:          params.profile  ? Number(params.profile)  : undefined,
        rim_size:         params.rim_size ? Number(params.rim_size) : undefined,
        brand:            brands ?? [],
        runflat:          params.runflat    === 'true' ? true : params.runflat === 'false' ? false : undefined,
        in_stock:         params.in_stock  === 'true',
        application_type: params.application_type,
        page:             params.page ? Number(params.page) : 1,
        sort:             (params.sort ?? 'stock_desc') as 'price_asc' | 'price_desc' | 'stock_desc',
      }}
    />
  )
}
