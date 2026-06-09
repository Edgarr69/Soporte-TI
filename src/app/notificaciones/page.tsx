export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { NotificationsView } from '@/components/shared/notifications-view'
import { getAuthedProfile } from '@/lib/auth'

export default async function NotificationsPage() {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const role = profile.role

  let notifQuery = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // admin_sistemas solo ve sistemas; admin_mantenimiento solo ve mantenimiento
  // super_admin ve todo; usuarios normales y técnicos ven todo lo suyo
  if (role === 'admin_sistemas') {
    notifQuery = notifQuery.eq('module', 'sistemas')
  } else if (role === 'admin_mantenimiento') {
    notifQuery = notifQuery.eq('module', 'mantenimiento')
  }

  const { data: notifications } = await notifQuery

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
          Notificaciones
        </h1>
        <NotificationsView
          initialNotifications={notifications ?? []}
          userId={user.id}
          role={role}
        />
    </main>
  )
}
