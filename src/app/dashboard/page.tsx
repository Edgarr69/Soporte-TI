export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserDashboard } from '@/components/dashboard/user-dashboard'
import { isAdminAny, homePathForRole, type Role } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')
  if (isAdminAny(profile.role as Role)) redirect(homePathForRole(profile.role as Role))

  // Resumen sistemas
  const { data: sysTickets } = await supabase
    .from('tickets')
    .select('id, folio, status, priority, created_at, updated_at, ticket_categories(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Resumen mantenimiento
  const { data: maintTickets } = await supabase
    .from('maintenance_tickets')
    .select('id, folio, type, status, servicio, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: recentNotifs } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <UserDashboard
      profile={profile}
      sysTickets={(sysTickets ?? []) as unknown as Parameters<typeof UserDashboard>[0]['sysTickets']}
      maintTickets={maintTickets ?? []}
      recentNotifs={recentNotifs ?? []}
    />
  )
}
