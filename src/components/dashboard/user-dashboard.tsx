'use client'

import Link from 'next/link'
import {
  PlusCircle, Ticket, Bell, Clock, CheckCircle2,
  Wrench, ChevronRight, Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import type { ProfileExtended, Notification, TicketStatus, Priority, MaintenanceStatus, MaintenanceType } from '@/lib/types'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS,
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS, MAINTENANCE_TYPE_LABELS,
} from '@/lib/types'
import { formatRelative, cn } from '@/lib/utils'
import { NumberTicker } from '@/components/ui/number-ticker'

interface SysTicketRow {
  id: string; folio: string; status: string; priority: string
  created_at: string; updated_at: string
  ticket_categories: { name: string } | null
}

interface MaintTicketRow {
  id: string; folio: string; type: string; status: string
  servicio: string; created_at: string; updated_at: string
}

interface Props {
  profile: ProfileExtended & { department?: { name: string } }
  sysTickets: SysTicketRow[]
  maintTickets: MaintTicketRow[]
  recentNotifs: Notification[]
}

export function UserDashboard({ profile, sysTickets, maintTickets, recentNotifs }: Props) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const sysCounts = {
    abiertos:   sysTickets.filter((t) => t.status === 'abierto' || t.status === 'reabierto').length,
    en_proceso: sysTickets.filter((t) => t.status === 'en_proceso' || t.status === 'en_espera').length,
    resueltos:  sysTickets.filter((t) => t.status === 'resuelto' || t.status === 'cerrado').length,
  }

  const maintCounts = {
    activos:    maintTickets.filter((t) => !['terminado','cancelado'].includes(t.status)).length,
    terminados: maintTickets.filter((t) => t.status === 'terminado').length,
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-10 pb-20 lg:pb-10">

      {/* Encabezado */}
      <section className="space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-zinc-50">
          {greeting}, {profile.full_name?.split(' ')[0] ?? 'usuario'}
        </h1>
        <p className="text-base text-zinc-500 dark:text-zinc-400">
          {profile.department?.name ?? 'Sin departamento asignado'}
        </p>
      </section>

      {/* Accesos rapidos */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Nueva solicitud
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickCard
            href="/tickets/nuevo"
            icon={<Monitor className="h-6 w-6 text-zinc-100 dark:text-zinc-900" />}
            iconBg="bg-zinc-900 dark:bg-zinc-100"
            title="Reportar problema de sistemas"
            description="Equipos, software, red, correo electronico"
          />
          <QuickCard
            href="/mantenimiento/nuevo?tipo=general"
            icon={<Wrench className="h-6 w-6 text-zinc-100 dark:text-zinc-900" />}
            iconBg="bg-zinc-700 dark:bg-zinc-200"
            title="Mantenimiento general"
            description="Instalaciones, edificio, areas comunes"
          />
          <QuickCard
            href="/mantenimiento/nuevo?tipo=maquinaria"
            icon={<Wrench className="h-6 w-6 text-white" />}
            iconBg="bg-indigo-600"
            title="Mantenimiento de maquinaria"
            description="Equipos de produccion, maquinaria industrial"
          />
        </div>
      </section>

      {/* Resumen de actividad */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Resumen de actividad
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Sistemas abiertos"      value={sysCounts.abiertos}   color="text-sky-600"    bg="bg-sky-50 dark:bg-sky-950/20"    border="border-sky-200 dark:border-sky-900/50" />
          <StatCard label="Sistemas en proceso"    value={sysCounts.en_proceso} color="text-amber-600"  bg="bg-amber-50 dark:bg-amber-950/20"  border="border-amber-200 dark:border-amber-900/50" />
          <StatCard label="Sistemas resueltos"     value={sysCounts.resueltos}  color="text-green-600"  bg="bg-green-50 dark:bg-green-950/20"  border="border-green-200 dark:border-green-900/50" />
          <StatCard label="Mantenimiento activo"   value={maintCounts.activos}  color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-950/20" border="border-indigo-200 dark:border-indigo-900/50" />
          <StatCard label="Mantenimiento terminado" value={maintCounts.terminados} color="text-zinc-500" bg="bg-zinc-50 dark:bg-zinc-900" border="border-zinc-200 dark:border-zinc-800" />
        </div>
      </section>

      {/* Tickets recientes + notificaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Columna de tickets (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Tickets de sistemas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Tickets de sistemas
              </h2>
              <LinkButton href="/mis-tickets?tab=sistemas" variant="ghost" size="sm">
                Ver todos <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </LinkButton>
            </div>

            {sysTickets.length === 0 ? (
              <EmptyState icon={<Ticket className="h-7 w-7" />} text="No tienes tickets de sistemas abiertos." />
            ) : (
              <div className="space-y-3">
                {sysTickets.slice(0, 5).map((t) => (
                  <Link key={t.id} href={`/tickets/${t.id}`}>
                    <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                              <span className="text-sm font-semibold truncate">
                                {(t.ticket_categories as { name: string } | null)?.name ?? 'Sin categoria'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">{formatRelative(t.updated_at)}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Badge className={cn('text-xs', PRIORITY_COLORS[t.priority as Priority])}>{t.priority}</Badge>
                            <Badge className={cn('text-xs', STATUS_COLORS[t.status as TicketStatus])}>
                              {STATUS_LABELS[t.status as TicketStatus]}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Solicitudes de mantenimiento */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                Solicitudes de mantenimiento
              </h2>
              <LinkButton href="/mis-tickets?tab=general" variant="ghost" size="sm">
                Ver todas <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </LinkButton>
            </div>

            {maintTickets.length === 0 ? (
              <EmptyState icon={<Wrench className="h-7 w-7" />} text="No tienes solicitudes de mantenimiento activas." />
            ) : (
              <div className="space-y-3">
                {maintTickets.slice(0, 5).map((t) => (
                  <Link key={t.id} href={`/mantenimiento/${t.id}`}>
                    <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                              <span className="text-sm font-semibold truncate">{t.servicio}</span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              {MAINTENANCE_TYPE_LABELS[t.type as MaintenanceType]} &middot; {formatRelative(t.updated_at)}
                            </p>
                          </div>
                          <Badge className={cn('text-xs flex-shrink-0', MAINTENANCE_STATUS_COLORS[t.status as MaintenanceStatus])}>
                            {MAINTENANCE_STATUS_LABELS[t.status as MaintenanceStatus]}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Columna de notificaciones (1/3) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
              Actividad reciente
            </h2>
          </div>

          {recentNotifs.length === 0 ? (
            <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
              <CardContent className="py-12 text-center">
                <Bell className="h-7 w-7 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">Sin notificaciones recientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentNotifs.map((n) => (
                <Card
                  key={n.id}
                  className={cn(
                    'border-zinc-200 dark:border-zinc-800',
                    !n.is_read && 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  <CardContent className="py-4 px-4">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{n.title}</p>
                    {n.body && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-zinc-400 mt-1.5">{formatRelative(n.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
              <div className="pt-1">
                <LinkButton href="/notificaciones" variant="ghost" size="sm" className="w-full justify-center">
                  Ver todas las notificaciones
                </LinkButton>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function QuickCard({
  href, icon, iconBg, title, description,
}: {
  href: string; icon: React.ReactNode; iconBg: string; title: string; description: string
}) {
  return (
    <Card className="group border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all hover:shadow-sm cursor-pointer">
      <Link href={href} className="block h-full">
        <CardContent className="p-4 sm:p-6">
          <div className={cn('p-3 rounded-xl w-fit mb-4 group-hover:scale-105 transition-transform', iconBg)}>
            {icon}
          </div>
          <CardTitle className="text-base leading-snug mb-1.5">{title}</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
        </CardContent>
      </Link>
    </Card>
  )
}

function StatCard({
  label, value, color, bg, border,
}: {
  label: string; value: number; color: string; bg: string; border: string
}) {
  return (
    <Card className={cn('border', border, bg)}>
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight mb-2">{label}</p>
        <NumberTicker value={value} className={cn('text-2xl sm:text-3xl font-bold', color)} />
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
      <CardContent className="py-10 text-center">
        <div className="text-zinc-300 dark:text-zinc-600 mx-auto mb-3 w-fit">{icon}</div>
        <p className="text-sm text-zinc-400">{text}</p>
      </CardContent>
    </Card>
  )
}
