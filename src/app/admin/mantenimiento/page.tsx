export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminMantenimientoDashboard } from '@/components/mantenimiento/admin-mant-dashboard'

export default async function AdminMantenimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const { data: all } = await supabase
    .from('maintenance_tickets')
    .select('id, folio, type, status, servicio, area_name_snapshot, department_name_snapshot, created_at, updated_at, assignment_time_minutes, resolution_time_minutes, tecnico_nombre_snapshot')
    .order('created_at', { ascending: false })

  const tickets = all ?? []

  const metrics = {
    total:       tickets.length,
    pendiente:   tickets.filter((t) => t.status === 'pendiente').length,
    en_revision: tickets.filter((t) => t.status === 'en_revision').length,
    asignado:    tickets.filter((t) => t.status === 'asignado').length,
    en_proceso:  tickets.filter((t) => t.status === 'en_proceso').length,
    terminado:   tickets.filter((t) => t.status === 'terminado').length,
    cancelado:   tickets.filter((t) => t.status === 'cancelado').length,
    general:     tickets.filter((t) => t.type === 'general').length,
    maquinaria:  tickets.filter((t) => t.type === 'maquinaria').length,
    avgAssignment: calcAvg(tickets.map((t) => t.assignment_time_minutes as number | null)),
    avgResolution: calcAvg(tickets.map((t) => t.resolution_time_minutes as number | null)),
  }

  // Monthly trend (last 6 months)
  const monthMap = new Map<string, number>()
  tickets.forEach((t) => {
    const month = t.created_at.slice(0, 7)
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1)
  })
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }))

  // By status (for vertical bar chart)
  const STATUS_SHORT: Record<string, string> = {
    pendiente:   'Pend.',
    en_revision: 'Revisión',
    asignado:    'Asign.',
    en_proceso:  'Proceso',
    terminado:   'Term.',
    cancelado:   'Canc.',
  }
  const byStatus = Object.entries(STATUS_SHORT).map(([key, label]) => ({
    label,
    value: tickets.filter((t) => t.status === key).length,
  }))

  // By area (top 8)
  const areaMap = new Map<string, number>()
  tickets.forEach((t) => {
    const name = t.area_name_snapshot ?? 'Sin área'
    areaMap.set(name, (areaMap.get(name) ?? 0) + 1)
  })
  const byArea = [...areaMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  // By technician (top 8, excluding unassigned)
  const tecMap = new Map<string, number>()
  tickets.forEach((t) => {
    const name = (t.tecnico_nombre_snapshot as string | null) ?? null
    if (!name) return
    tecMap.set(name, (tecMap.get(name) ?? 0) + 1)
  })
  const byTecnico = [...tecMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const recent = tickets.slice(0, 10)

  return (
    <AdminMantenimientoDashboard
      metrics={metrics}
      byStatus={byStatus}
      byArea={byArea}
      byTecnico={byTecnico}
      monthly={monthly}
      recentTickets={recent}
    />
  )
}

function calcAvg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x !== null)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}
