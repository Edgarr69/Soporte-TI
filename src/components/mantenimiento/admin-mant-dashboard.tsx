'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  AlertCircle, Clock, CheckCircle2, List, Wrench,
  TrendingUp, ChevronRight, XCircle, Users,
} from 'lucide-react'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS, MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { minutesToHuman, formatRelative, cn } from '@/lib/utils'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AreaSparkLine, VerticalBarChart, HorizontalBarList } from '@/components/shared/charts'

interface Props {
  metrics: {
    total: number
    pendiente: number
    en_revision: number
    asignado: number
    en_proceso: number
    terminado: number
    cancelado: number
    general: number
    maquinaria: number
    avgAssignment: number | null
    avgResolution: number | null
  }
  byStatus: { label: string; value: number }[]
  byArea: { name: string; count: number }[]
  byTecnico: { name: string; count: number }[]
  monthly: { month: string; count: number }[]
  recentTickets: {
    id: string
    folio: string
    type: string
    status: string
    servicio: string
    area_name_snapshot: string | null
    department_name_snapshot: string | null
    updated_at: string
  }[]
}

export function AdminMantenimientoDashboard({
  metrics, byStatus, byArea, byTecnico, monthly, recentTickets,
}: Props) {
  const monthlyChart = monthly.map((m) => ({
    label: m.month.slice(5, 7) + '/' + m.month.slice(2, 4),
    value: m.count,
  }))

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* KPIs */}
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Dashboard Mantenimiento
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Total"       value={metrics.total}       icon={<List className="h-4 w-4 text-zinc-500" />} />
          <KpiCard label="Pendientes"  value={metrics.pendiente}   icon={<AlertCircle className="h-4 w-4 text-yellow-600" />}  valueColor="text-yellow-600" />
          <KpiCard label="En revisión" value={metrics.en_revision} icon={<Clock className="h-4 w-4 text-sky-600" />}            valueColor="text-sky-600" />
          <KpiCard label="Asignados"   value={metrics.asignado}    icon={<Wrench className="h-4 w-4 text-indigo-600" />}        valueColor="text-indigo-600" />
          <KpiCard label="En proceso"  value={metrics.en_proceso}  icon={<Clock className="h-4 w-4 text-amber-600" />}          valueColor="text-amber-600" />
          <KpiCard label="Terminados"  value={metrics.terminado}   icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}   valueColor="text-green-600" />
          <KpiCard label="Cancelados"  value={metrics.cancelado}   icon={<XCircle className="h-4 w-4 text-red-500" />}          valueColor="text-red-500" />
          <KpiCard label="Maquinaria"  value={metrics.maquinaria}  icon={<Wrench className="h-4 w-4 text-purple-600" />}        valueColor="text-purple-600" />
        </div>
      </section>

      {/* Tiempos promedio */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Tiempo prom. asignación</p>
            <TimeDisplay minutes={metrics.avgAssignment} />
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Tiempo prom. resolución</p>
            <TimeDisplay minutes={metrics.avgResolution} />
          </CardContent>
        </Card>
      </div>

      {/* Gráficas fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendencia mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AreaSparkLine data={monthlyChart} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Solicitudes por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={byStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Gráficas fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Técnicos con más asignaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList data={byTecnico} />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Solicitudes por área</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList data={byArea} />
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes recientes */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Solicitudes recientes</CardTitle>
          <LinkButton href="/admin/mantenimiento/tickets" variant="ghost" size="sm">
            Ver todas <ChevronRight className="h-3 w-3 ml-0.5" />
          </LinkButton>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {recentTickets.map((t) => (
              <Link key={t.id} href={`/admin/mantenimiento/tickets/${t.id}`}>
                <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                      <span className="text-sm font-medium truncate">{t.servicio}</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {t.department_name_snapshot ?? '—'}
                      {t.area_name_snapshot ? ` · ${t.area_name_snapshot}` : ''}
                      {' · '}{formatRelative(t.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {MAINTENANCE_TYPE_LABELS[t.type as MaintenanceType]}
                    </Badge>
                    <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[t.status as MaintenanceStatus])}>
                      {MAINTENANCE_STATUS_LABELS[t.status as MaintenanceStatus]}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
            {!recentTickets.length && (
              <p className="text-sm text-zinc-400 py-4 text-center">Sin solicitudes recientes.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  label, value, icon, valueColor,
}: {
  label: string; value: number; icon: React.ReactNode; valueColor?: string
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
        <NumberTicker value={value} className={cn('text-2xl sm:text-3xl font-bold', valueColor ?? 'text-zinc-900 dark:text-zinc-50')} />
      </CardContent>
    </Card>
  )
}

function TimeDisplay({ minutes }: { minutes: number | null }) {
  if (minutes === null)
    return <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">—</p>
  const isHours = minutes >= 60
  const display = isHours ? Math.round((minutes / 60) * 10) / 10 : minutes
  return (
    <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-baseline gap-1">
      <NumberTicker value={display} decimalPlaces={isHours ? 1 : 0} />
      <span className="text-sm font-normal text-zinc-400">{isHours ? 'h' : 'min'}</span>
    </p>
  )
}
