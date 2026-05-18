import { createClient } from '@/lib/supabase/client'

const BUCKET = 'product-images'

export async function uploadProductImage(file: File, folder = 'gallery'): Promise<string> {
  const supabase = createClient()
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteProductImage(publicUrl: string): Promise<void> {
  const supabase = createClient()
  // Extract the storage path from the full public URL
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  await supabase.storage.from(BUCKET).remove([path])
}
