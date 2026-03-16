export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { cn } from '@/lib/utils'

export default async function AdminMaintenanceReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const { data: all } = await supabase
    .from('maintenance_tickets')
    .select('id, type, status, servicio, department_name_snapshot, area_name_snapshot, created_at, resolution_time_minutes')
    .order('created_at', { ascending: false })

  const tickets = all ?? []

  // Estadísticas por estado
  const byStatus = Object.entries(MAINTENANCE_STATUS_LABELS).map(([status, label]) => ({
    status, label,
    count: tickets.filter((t) => t.status === status).length,
  }))

  // Por tipo
  const byType = Object.entries(MAINTENANCE_TYPE_LABELS).map(([type, label]) => ({
    type, label,
    count: tickets.filter((t) => t.type === type).length,
  }))

  // Por departamento
  const deptMap = new Map<string, number>()
  tickets.forEach((t) => {
    const k = t.department_name_snapshot ?? 'Sin depto.'
    deptMap.set(k, (deptMap.get(k) ?? 0) + 1)
  })
  const byDept = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Por área
  const areaMap = new Map<string, number>()
  tickets.forEach((t) => {
    const k = t.area_name_snapshot ?? 'Sin área'
    areaMap.set(k, (areaMap.get(k) ?? 0) + 1)
  })
  const byArea = [...areaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Tendencia mensual
  const monthMap = new Map<string, number>()
  tickets.forEach((t) => {
    const m = t.created_at.slice(0, 7)
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
  })
  const monthly = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Reportes de Mantenimiento</h1>

      {/* Por estado */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Por estado</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {byStatus.map(({ status, label, count }) => (
            <Card key={status}>
              <CardContent className="p-3">
                <Badge className={cn('text-xs mb-2', MAINTENANCE_STATUS_COLORS[status as MaintenanceStatus])}>
                  {label}
                </Badge>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Por tipo */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Por tipo</h2>
        <div className="grid grid-cols-2 gap-3">
          {byType.map(({ type, label, count }) => (
            <Card key={type}>
              <CardContent className="p-3">
                <p className="text-xs text-zinc-400 mb-1">{label}</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Por departamento + área */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Por departamento</h2>
          <Card>
            <CardContent className="py-3 px-4 space-y-2">
              {byDept.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm truncate">{name}</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-3">{count}</span>
                </div>
              ))}
              {!byDept.length && <p className="text-xs text-zinc-400">Sin datos.</p>}
            </CardContent>
          </Card>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Por área</h2>
          <Card>
            <CardContent className="py-3 px-4 space-y-2">
              {byArea.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-sm truncate">{name}</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-3">{count}</span>
                </div>
              ))}
              {!byArea.length && <p className="text-xs text-zinc-400">Sin datos.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tendencia mensual */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Tendencia mensual</h2>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-end gap-2 h-24">
              {monthly.map(([month, count]) => {
                const max = Math.max(...monthly.map(([, c]) => c), 1)
                const h = Math.round((count / max) * 80)
                return (
                  <div key={month} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{count}</span>
                    <div
                      className="w-full bg-indigo-500 dark:bg-indigo-600 rounded-t"
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-xs text-zinc-400">{month.slice(5)}</span>
                  </div>
                )
              })}
              {!monthly.length && <p className="text-xs text-zinc-400">Sin datos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
