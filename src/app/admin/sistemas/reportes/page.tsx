export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminReportsView } from '@/components/admin/admin-reports'

export default async function AdminReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, status, priority, is_reopened, created_at, resolved_at, closed_at,
      first_response_time_minutes, resolution_time_minutes,
      ticket_categories(name),
      ticket_subcategories(name),
      user:profiles(full_name, email),
      department:departments(name)
    `)
    .order('created_at', { ascending: false })

  const all = tickets ?? []

  // Por mes
  const monthMap = new Map<string, number>()
  all.forEach((t) => {
    const month = t.created_at.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
  })
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  // Por categoría
  const catMap = new Map<string, { total: number; critica: number }>()
  all.forEach((t) => {
    const name = (t.ticket_categories as unknown as { name: string } | null)?.name ?? 'Sin categoría'
    const cur = catMap.get(name) ?? { total: 0, critica: 0 }
    cur.total++
    if (t.priority === 'critica') cur.critica++
    catMap.set(name, cur)
  })
  const byCategory = [...catMap.entries()].map(([name, v]) => ({ name, ...v }))

  // Por prioridad
  const prioMap = new Map<string, number>()
  all.forEach((t) => prioMap.set(t.priority, (prioMap.get(t.priority) ?? 0) + 1))
  const byPriority = ['critica', 'alta', 'media', 'baja'].map((p) => ({
    name: p, count: prioMap.get(p) ?? 0,
  }))

  // Por departamento
  const deptMap = new Map<string, number>()
  all.forEach((t) => {
    const name = (t.department as unknown as { name: string } | null)?.name ?? 'Sin depto.'
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1)
  })
  const byDepartment = [...deptMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Top usuarios
  const userMap = new Map<string, { name: string; count: number }>()
  all.forEach((t) => {
    const u = t.user as unknown as { full_name: string; email: string } | null
    const key = u?.email ?? 'desconocido'
    const cur = userMap.get(key) ?? { name: u?.full_name ?? key, count: 0 }
    cur.count++
    userMap.set(key, cur)
  })
  const topUsers = [...userMap.entries()]
    .map(([email, v]) => ({ email, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Tiempos
  const validResponse = all
    .map((t) => t.first_response_time_minutes as number | null)
    .filter((v): v is number => v !== null)
  const validResolution = all
    .map((t) => t.resolution_time_minutes as number | null)
    .filter((v): v is number => v !== null)

  const avgFirstResponse = validResponse.length
    ? Math.round(validResponse.reduce((a, b) => a + b, 0) / validResponse.length)
    : null
  const avgResolution = validResolution.length
    ? Math.round(validResolution.reduce((a, b) => a + b, 0) / validResolution.length)
    : null

  return (
    <AdminReportsView
      monthly={monthly}
      byCategory={byCategory}
      byPriority={byPriority}
      byDepartment={byDepartment}
      topUsers={topUsers}
      avgFirstResponse={avgFirstResponse}
      avgResolution={avgResolution}
      totalTickets={all.length}
      reopenedCount={all.filter((t) => t.is_reopened).length}
      criticalPercent={all.length ? Math.round((prioMap.get('critica') ?? 0) / all.length * 100) : 0}
    />
  )
}
