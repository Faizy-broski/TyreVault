import { createClient } from '@/lib/supabase/server'
import CreateProductWizard from '@/components/admin/products/CreateProductWizard'

export const metadata = { title: 'Create Product' }

export default async function NewProductPage() {
  const supabase = await createClient()

  // Prefetch all dropdown data in parallel
  const [brandsRes, collectionsRes, categoriesRes, warehousesRes] = await Promise.all([
    supabase.from('brands').select('brand_id, brand_name').eq('is_active', true).order('brand_name'),
    supabase.from('collections').select('collection_id, collection_name').eq('is_active', true).order('collection_name'),
    supabase.from('categories').select('category_id, category_name, category_type').eq('is_active', true),
    supabase.from('warehouses').select('warehouse_id, warehouse_name').eq('is_own_warehouse', true).eq('is_active', true),
  ])

  return (
    <CreateProductWizard
      brands={brandsRes.data ?? []}
      collections={collectionsRes.data ?? []}
      categories={categoriesRes.data ?? []}
      warehouses={warehousesRes.data ?? []}
    />
  )
}
