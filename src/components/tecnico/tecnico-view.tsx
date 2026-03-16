'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { cn, formatDate, formatRelative } from '@/lib/utils'
import { Wrench, ClipboardList } from 'lucide-react'

interface TicketRow {
  id: string
  folio: string
  type: string
  status: string
  servicio: string
  descripcion?: string
  department_name_snapshot: string | null
  area_name_snapshot?: string | null
  fecha_solicitud: string
  fecha_termino_estimada?: string | null
  created_at: string
  updated_at: string
}

interface HistRow {
  id: string
  folio: string
  type: string
  status: string
  servicio: string
  department_name_snapshot: string | null
  fecha_solicitud: string
  updated_at: string
}

interface Props {
  active:         TicketRow[]
  history:        HistRow[]
  technicianName: string
}

export function TecnicoView({ active, history, technicianName }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Hola, {technicianName.split(' ')[0] || 'técnico'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Panel de técnico de mantenimiento</p>
      </section>

      {/* Active assignments */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
            Asignaciones activas ({active.length})
          </h2>
        </div>

        {active.length === 0 ? (
          <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
            <CardContent className="py-10 text-center">
              <Wrench className="h-7 w-7 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sin asignaciones activas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {active.map((t) => (
              <Link key={t.id} href={`/mantenimiento/${t.id}`}>
                <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                          <span className="text-sm font-semibold truncate">{t.servicio}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {t.department_name_snapshot ?? '—'}
                          {t.area_name_snapshot ? ` · ${t.area_name_snapshot}` : ''}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Solicitud: {formatDate(t.fecha_solicitud)}
                          {t.fecha_termino_estimada ? ` · Término: ${formatDate(t.fecha_termino_estimada)}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[t.status as MaintenanceStatus])}>
                          {MAINTENANCE_STATUS_LABELS[t.status as MaintenanceStatus]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {MAINTENANCE_TYPE_LABELS[t.type as MaintenanceType]}
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

      {/* History */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Historial reciente
            </h2>
          </div>
          <div className="space-y-2">
            {history.map((t) => (
              <Link key={t.id} href={`/mantenimiento/${t.id}`}>
                <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors opacity-75 hover:opacity-100 transition-opacity">
                  <CardContent className="py-2.5 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                          <span className="text-sm truncate">{t.servicio}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{formatRelative(t.updated_at)}</p>
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
        </section>
      )}
    </main>
  )
}
