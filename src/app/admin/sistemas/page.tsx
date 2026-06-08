export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminDashboardView } from '@/components/admin/admin-dashboard'
import { getCachedSistemasStats } from '@/lib/admin-dashboard-cache'
import { getAuthedProfile } from '@/lib/auth'

export default async function AdminDashboardPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const stats = await getCachedSistemasStats()
  const { summary } = stats

  const metrics = {
    total: summary.total,
    abierto: summary.abierto, en_proceso: summary.en_proceso, en_espera: summary.en_espera,
    resuelto: summary.resuelto, cerrado: summary.cerrado, reabierto: summary.reabierto,
    critica: summary.critica, alta: summary.alta, media: summary.media, baja: summary.baja,
    avgFirstResponse: summary.avg_first_response,
    avgResolution: summary.avg_resolution,
  }

  const topUsers = stats.topUsers
    .slice(0, 8)
    .map((u) => ({ email: u.email, name: u.full_name ?? u.email, count: u.total }))

  const byCategory   = stats.byCategory.map((c) => ({ name: c.name, count: c.total }))
  const byDepartment = stats.byDepartment.map((d) => ({ name: d.name, count: d.total }))
  const monthly      = stats.byMonth.slice(-6).map((m) => ({ month: m.month, count: m.total }))

  return (
    <AdminDashboardView
      metrics={metrics}
      topUsers={topUsers}
      byCategory={byCategory}
      byDepartment={byDepartment}
      monthly={monthly}
      recentTickets={stats.recentTickets as unknown as Record<string, unknown>[]}
    />
  )
}
