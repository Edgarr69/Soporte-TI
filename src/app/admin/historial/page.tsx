import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminAny, type Role, type AdminNotification, type AdminNotificationType } from '@/lib/types'
import { AdminNotificationList } from '@/components/admin/admin-notification-list'

export const dynamic = 'force-dynamic'

export default async function AdminHistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !isAdminAny(profile.role as Role)) redirect('/dashboard')

  const role = profile.role as Role

  const { data: rawNotifications } = await supabase
    .rpc('get_admin_notifications_for_user', { p_limit: 150, p_offset: 0 })

  const MAINT_TYPES: AdminNotificationType[] = [
    'maintenance_created', 'maintenance_status_changed',
    'maintenance_assigned', 'maintenance_closed', 'maintenance_cancelled',
  ]
  const SIST_TYPES: AdminNotificationType[] = [
    'ticket_created', 'ticket_status_changed', 'ticket_closed', 'ticket_reopened',
  ]
  function notifModule(n: AdminNotification) {
    if (n.module) return n.module
    if (MAINT_TYPES.includes(n.type)) return 'mantenimiento'
    if (SIST_TYPES.includes(n.type))  return 'sistemas'
    return 'global'
  }

  // Filtrar por módulo según rol
  const notifications = ((rawNotifications ?? []) as AdminNotification[]).filter((n) => {
    const mod = notifModule(n)
    if (role === 'admin_sistemas')      return mod === 'sistemas' || mod === 'global'
    if (role === 'admin_mantenimiento') return mod === 'mantenimiento' || mod === 'global'
    return true // super_admin ve todo
  })

  return (
    <div className="max-w-3xl w-full flex-1 min-h-0 flex flex-col gap-4">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Historial de actividad
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Eventos del sistema de los últimos 21 días
        </p>
      </div>

      <AdminNotificationList
        notifications={notifications}
        role={role}
      />
    </div>
  )
}
