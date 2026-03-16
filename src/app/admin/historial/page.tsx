import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminAny, type Role, type AdminNotification } from '@/lib/types'
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

  const { data: notifications } = await supabase
    .rpc('get_admin_notifications_for_user', { p_limit: 150, p_offset: 0 })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Historial de actividad
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Eventos del sistema de los últimos 21 días
        </p>
      </div>

      <AdminNotificationList
        notifications={(notifications ?? []) as AdminNotification[]}
      />
    </div>
  )
}
