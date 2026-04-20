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

  // Un solo loop para métricas, mapas y tendencia
  let abierto = 0, en_proceso = 0, en_espera = 0, resuelto = 0, cerrado = 0, reabierto = 0
  let critica = 0, alta = 0, media = 0, baja = 0
  const firstResponseTimes: number[] = []
  const resolutionTimes: number[]    = []
  const userMap  = new Map<string, { name: string; count: number }>()
  const catMap   = new Map<string, number>()
  const deptMap  = new Map<string, number>()
  const monthMap = new Map<string, number>()

  for (const t of all) {
    if      (t.status === 'abierto')    abierto++
    else if (t.status === 'en_proceso') en_proceso++
    else if (t.status === 'en_espera')  en_espera++
    else if (t.status === 'resuelto')   resuelto++
    else if (t.status === 'cerrado')    cerrado++
    else if (t.status === 'reabierto')  reabierto++

    if      (t.priority === 'critica') critica++
    else if (t.priority === 'alta')    alta++
    else if (t.priority === 'media')   media++
    else if (t.priority === 'baja')    baja++

    if (t.first_response_time_minutes != null) firstResponseTimes.push(t.first_response_time_minutes as number)
    if (t.resolution_time_minutes     != null) resolutionTimes.push(t.resolution_time_minutes as number)

    const u   = t.user as unknown as { full_name: string; email: string } | null
    const key = u?.email ?? 'desconocido'
    const existing = userMap.get(key)
    if (existing) existing.count++
    else userMap.set(key, { name: u?.full_name ?? key, count: 1 })

    const catName  = (t.ticket_categories as unknown as { name: string } | null)?.name ?? 'Sin categoría'
    catMap.set(catName, (catMap.get(catName) ?? 0) + 1)

    const deptName = (t.department as unknown as { name: string } | null)?.name ?? 'Sin depto.'
    deptMap.set(deptName, (deptMap.get(deptName) ?? 0) + 1)

    const month = t.created_at.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
  }

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null

  const metrics = {
    total: all.length,
    abierto, en_proceso, en_espera, resuelto, cerrado, reabierto,
    critica, alta, media, baja,
    avgFirstResponse: avg(firstResponseTimes),
    avgResolution:    avg(resolutionTimes),
  }

  const topUsers = [...userMap.entries()]
    .map(([email, v]) => ({ email, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const byCategory   = [...catMap.entries()].map(([name, count]) => ({ name, count }))
  const byDepartment = [...deptMap.entries()].map(([name, count]) => ({ name, count }))
  const monthly      = [...monthMap.entries()]
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

