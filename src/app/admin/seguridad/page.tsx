export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminSeguridadDashboard } from '@/components/seguridad/admin-seguridad-dashboard'
import { getCachedSeguridadStats } from '@/lib/admin-dashboard-cache'
import { getAuthedProfile } from '@/lib/auth'

export default async function AdminSeguridadPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_seguridad', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const stats = await getCachedSeguridadStats()

  return (
    <AdminSeguridadDashboard
      summary={stats.summary}
      byCategory={stats.byCategory}
      byArea={stats.byArea}
      byMonth={stats.byMonth}
      openTickets={stats.openTickets}
    />
  )
}
