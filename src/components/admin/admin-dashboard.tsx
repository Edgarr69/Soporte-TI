'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import {
  AlertTriangle, Clock, CheckCircle2, Ticket, RotateCcw,
  Users, TrendingUp, ChevronRight,
} from 'lucide-react'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  type TicketStatus, type Priority,
} from '@/lib/types'
import { minutesToHuman, formatRelative, cn } from '@/lib/utils'
import { AreaSparkLine, VerticalBarChart, HorizontalBarList } from '@/components/shared/charts'
import { NumberTicker } from '@/components/ui/number-ticker'

interface Props {
  metrics: {
    total: number; abierto: number; en_proceso: number; en_espera: number
    resuelto: number; cerrado: number; reabierto: number
    critica: number; alta: number; media: number; baja: number
    avgFirstResponse: number | null; avgResolution: number | null
  }
  topUsers: { email: string; name: string; count: number }[]
  byCategory: { name: string; count: number }[]
  byDepartment: { name: string; count: number }[]
  monthly: { month: string; count: number }[]
  recentTickets: Record<string, unknown>[]
}

export function AdminDashboardView({
  metrics, topUsers, byCategory, byDepartment, monthly, recentTickets,
}: Props) {
  const monthlyChart = monthly.map((m) => ({
    label: m.month.slice(5, 7) + '/' + m.month.slice(2, 4),
    value: m.count,
  }))

  const categoryChart = byCategory
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((c) => ({ label: c.name, value: c.count }))

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* KPIs principales */}
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Total tickets"   value={metrics.total}      icon={<Ticket className="h-4 w-4 text-zinc-500" />} />
          <KpiCard label="Abiertos"        value={metrics.abierto}    icon={<AlertTriangle className="h-4 w-4 text-blue-600" />}   valueColor="text-blue-600" />
          <KpiCard label="En proceso"      value={metrics.en_proceso} icon={<Clock className="h-4 w-4 text-amber-600" />}          valueColor="text-amber-600" />
          <KpiCard label="Reabiertos"      value={metrics.reabierto}  icon={<RotateCcw className="h-4 w-4 text-purple-600" />}     valueColor="text-purple-600" />
          <KpiCard label="Críticos"        value={metrics.critica}    icon={<AlertTriangle className="h-4 w-4 text-red-600" />}    valueColor="text-red-600" />
          <KpiCard label="Resueltos"       value={metrics.resuelto}   icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}   valueColor="text-green-600" />
          <KpiCard label="Cerrados"        value={metrics.cerrado}    icon={<CheckCircle2 className="h-4 w-4 text-zinc-400" />}    valueColor="text-zinc-400" />
          <KpiCard label="En espera"       value={metrics.en_espera}  icon={<Clock className="h-4 w-4 text-orange-600" />}         valueColor="text-orange-600" />
        </div>
      </section>

      {/* Tiempos promedio */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Tiempo prom. primera respuesta</p>
            <TimeDisplay minutes={metrics.avgFirstResponse} />
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
            <CardTitle className="text-sm">Tickets por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={categoryChart} />
          </CardContent>
        </Card>
      </div>

      {/* Gráficas fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios con más tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              data={topUsers.map((u) => ({ name: u.name || u.email, count: u.count }))}
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tickets por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarList
              data={byDepartment
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((d) => ({ name: d.name, count: d.count }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tickets recientes */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Tickets recientes</CardTitle>
          <LinkButton href="/admin/sistemas/tickets" variant="ghost" size="sm">
            Ver todos <ChevronRight className="h-3 w-3 ml-0.5" />
          </LinkButton>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {recentTickets.map((t) => {
              const ticket = t as {
                id: string; folio: string; status: string; priority: string
                created_at: string
                ticket_categories: { name: string } | { name: string }[] | null
                user: { full_name: string } | { full_name: string }[] | null
              }
              const catName = Array.isArray(ticket.ticket_categories)
                ? ticket.ticket_categories[0]?.name
                : ticket.ticket_categories?.name
              const userName = Array.isArray(ticket.user)
                ? ticket.user[0]?.full_name
                : ticket.user?.full_name
              return (
                <Link key={ticket.id} href={`/admin/sistemas/tickets/${ticket.id}`}>
                  <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
                        <span className="text-sm font-medium truncate">
                          {userName ?? '—'} — {catName ?? '—'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{formatRelative(ticket.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={cn('text-xs', PRIORITY_COLORS[ticket.priority as Priority])}>
                        {PRIORITY_LABELS[ticket.priority as Priority] ?? ticket.priority}
                      </Badge>
                      <Badge className={cn('text-xs', STATUS_COLORS[ticket.status as TicketStatus])}>
                        {STATUS_LABELS[ticket.status as TicketStatus]}
                      </Badge>
                    </div>
                  </div>
                </Link>
              )
            })}
            {!recentTickets.length && (
              <p className="text-sm text-zinc-400 py-4 text-center">Sin tickets recientes.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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
