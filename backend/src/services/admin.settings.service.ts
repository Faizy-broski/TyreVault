import { supabase as db } from './supabase.service'

export async function getSetting(key: string) {
  const { data, error } = await db
    .from('system_settings')
    .select('key, value, updated_at')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function setSetting(key: string, value: unknown) {
  const { data, error } = await db
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select('key, value, updated_at')
    .single()

  if (error) throw error
  return data
}
