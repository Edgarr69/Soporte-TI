export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboardView } from '@/components/admin/admin-dashboard'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Todos los tickets
  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, folio, status, priority, is_reopened, created_at,
      first_response_time_minutes, resolution_time_minutes,
      ticket_categories(name),
      department:departments(name),
      user:profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })

  const all = tickets ?? []

  const metrics = {
    total:      all.length,
    abierto:    all.filter((t) => t.status === 'abierto').length,
    en_proceso: all.filter((t) => t.status === 'en_proceso').length,
    en_espera:  all.filter((t) => t.status === 'en_espera').length,
    resuelto:   all.filter((t) => t.status === 'resuelto').length,
    cerrado:    all.filter((t) => t.status === 'cerrado').length,
    reabierto:  all.filter((t) => t.status === 'reabierto').length,
    critica:    all.filter((t) => t.priority === 'critica').length,
    alta:       all.filter((t) => t.priority === 'alta').length,
    media:      all.filter((t) => t.priority === 'media').length,
    baja:       all.filter((t) => t.priority === 'baja').length,
    avgFirstResponse: calcAvg(all.map((t) => t.first_response_time_minutes as number | null)),
    avgResolution:    calcAvg(all.map((t) => t.resolution_time_minutes as number | null)),
  }

  // Top usuarios
  const userMap = new Map<string, { name: string; count: number }>()
  all.forEach((t) => {
    const u = t.user as unknown as { full_name: string; email: string } | null
    const key = u?.email ?? 'desconocido'
    const existing = userMap.get(key)
    if (existing) existing.count++
    else userMap.set(key, { name: u?.full_name ?? key, count: 1 })
  })
  const topUsers = [...userMap.entries()]
    .map(([email, v]) => ({ email, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // Por categoría
  const catMap = new Map<string, number>()
  all.forEach((t) => {
    const name = (t.ticket_categories as unknown as { name: string } | null)?.name ?? 'Sin categoría'
    catMap.set(name, (catMap.get(name) ?? 0) + 1)
  })
  const byCategory = [...catMap.entries()].map(([name, count]) => ({ name, count }))

  // Por departamento
  const deptMap = new Map<string, number>()
  all.forEach((t) => {
    const name = (t.department as unknown as { name: string } | null)?.name ?? 'Sin depto.'
    deptMap.set(name, (deptMap.get(name) ?? 0) + 1)
  })
  const byDepartment = [...deptMap.entries()].map(([name, count]) => ({ name, count }))

  // Tendencia mensual (últimos 6 meses)
  const monthMap = new Map<string, number>()
  all.forEach((t) => {
    const month = t.created_at.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
  })
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }))

  return (
    <AdminDashboardView
      metrics={metrics}
      topUsers={topUsers}
      byCategory={byCategory}
      byDepartment={byDepartment}
      monthly={monthly}
      recentTickets={all.slice(0, 10) as unknown as Record<string, unknown>[]}
    />
  )
}

function calcAvg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (!valid.length) return null
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}
