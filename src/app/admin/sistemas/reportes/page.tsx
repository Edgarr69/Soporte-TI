export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminReportsView } from '@/components/admin/admin-reports'
import { getCachedSistemasStats } from '@/lib/admin-dashboard-cache'
import { getAuthedProfile } from '@/lib/auth'

export default async function AdminReportesPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const stats = await getCachedSistemasStats()
  const { summary } = stats

  const monthly = stats.byMonth.map((m) => ({ month: m.month, count: m.total }))

  const byCategory = stats.byCategory.map((c) => ({ name: c.name, total: c.total, critica: c.critica }))

  const byPriority = ['critica', 'alta', 'media', 'baja'].map((p) => ({
    name: p, count: summary[p as 'critica' | 'alta' | 'media' | 'baja'],
  }))

  const byDepartment = stats.byDepartment
    .map((d) => ({ name: d.name, count: d.total }))
    .sort((a, b) => b.count - a.count)

  const topUsers = stats.topUsers
    .slice(0, 10)
    .map((u) => ({ email: u.email, name: u.full_name ?? u.email, count: u.total }))

  return (
    <AdminReportsView
      monthly={monthly}
      byCategory={byCategory}
      byPriority={byPriority}
      byDepartment={byDepartment}
      topUsers={topUsers}
      avgFirstResponse={summary.avg_first_response}
      avgResolution={summary.avg_resolution}
      totalTickets={summary.total}
      reopenedCount={summary.reopened_count}
      criticalPercent={summary.total ? Math.round((summary.critica / summary.total) * 100) : 0}
    />
  )
}
