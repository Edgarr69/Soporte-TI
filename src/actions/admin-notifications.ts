'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AdminNotificationType, AdminNotificationModule } from '@/lib/types'

interface CreateAdminNotificationParams {
  title: string
  message?: string
  type: AdminNotificationType
  module: AdminNotificationModule
  actorId?: string
  actorName?: string
  targetId?: string
  targetType?: string
  targetFolio?: string
  metadata?: Record<string, unknown>
}

export async function createAdminNotification(params: CreateAdminNotificationParams) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('insert_admin_notification', {
    p_title:        params.title,
    p_message:      params.message      ?? null,
    p_type:         params.type,
    p_module:       params.module,
    p_actor_id:     params.actorId      ?? null,
    p_actor_name:   params.actorName    ?? null,
    p_target_id:    params.targetId     ?? null,
    p_target_type:  params.targetType   ?? null,
    p_target_folio: params.targetFolio  ?? null,
    p_metadata:     params.metadata     ?? null,
  })
  if (error) console.error('[createAdminNotification]', error.message)
}

export async function markAllAdminNotificationsRead() {
  const supabase = await createClient()
  await supabase.rpc('mark_all_admin_notifications_read')
  revalidatePath('/admin/historial')
}
