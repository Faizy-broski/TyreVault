import { supabase as db } from './supabase.service'

export interface NotificationPayload {
  recipient_id: string
  type:         string
  title:        string
  body?:        string
  metadata?:    Record<string, unknown>
}

/**
 * Insert one or more in-app notification rows.
 * Fire-and-forget safe — errors are logged, not thrown.
 */
export async function insertNotifications(rows: NotificationPayload[]): Promise<void> {
  if (!rows.length) return
  const { error } = await db.from('notifications').insert(
    rows.map(r => ({
      recipient_id: r.recipient_id,
      type:         r.type,
      title:        r.title,
      body:         r.body ?? null,
      metadata:     r.metadata ?? {},
    }))
  )
  if (error) console.error('[notifications] insert failed:', error.message)
}

/**
 * Returns the auth.users.id for every super_admin profile.
 * Used to fan out admin notifications when there are multiple admins.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await db
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
  if (error || !data) return []
  return data.map((p: any) => p.id)
}
