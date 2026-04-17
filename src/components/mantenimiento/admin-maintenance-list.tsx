'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { cn, formatRelative } from '@/lib/utils'
import { Ticket } from 'lucide-react'

interface TicketRow {
  id: string
  folio: string
  type: string
  status: string
  servicio: string
  department_name_snapshot: string | null
  area_name_snapshot: string | null
  encargado_nombre: string
  tecnico_nombre_snapshot: string | null
  fecha_solicitud: string
  created_at: string
  updated_at: string
  user: { full_name: string | null; email: string } | null
}

interface Props {
  tickets: TicketRow[]
  currentFilters: { status?: string; type?: string }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'asignado',    label: 'Asignado' },
  { value: 'en_proceso',  label: 'En proceso' },
  { value: 'terminado',   label: 'Terminado' },
  { value: 'cancelado',   label: 'Cancelado' },
]

const TYPE_OPTIONS = [
  { value: '',           label: 'Todos los tipos' },
  { value: 'general',    label: 'General' },
  { value: 'maquinaria', label: 'Maquinaria' },
]

export function AdminMaintenanceList({ tickets, currentFilters }: Props) {
  const router  = useRouter()
  const path    = usePathname()

  function setFilter(key: string, value: string) {
    const sp = new URLSearchParams()
    if (key !== 'status' && currentFilters.status) sp.set('status', currentFilters.status)
    if (key !== 'type'   && currentFilters.type)   sp.set('type', currentFilters.type)
    if (value) sp.set(key, value)
    router.push(`${path}?${sp.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Solicitudes de mantenimiento
          <span className="ml-2 text-sm font-normal text-zinc-400">({tickets.length})</span>
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter('status', opt.value)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              (currentFilters.status ?? '') === opt.value
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
            )}
          >
            {opt.label}
          </button>
        ))}
        <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter('type', opt.value)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              (currentFilters.type ?? '') === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      {tickets.length === 0 ? (
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-12 text-center">
            <Ticket className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin solicitudes con estos filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/mantenimiento/tickets/${t.id}`}>
              <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                        <span className="text-sm font-semibold truncate">{t.servicio}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {t.user?.full_name ?? t.user?.email ?? '—'}
                        {' · '}{t.department_name_snapshot ?? '—'}
                        {t.area_name_snapshot ? ` · ${t.area_name_snapshot}` : ''}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {t.tecnico_nombre_snapshot
                          ? `Técnico: ${t.tecnico_nombre_snapshot} · `
                          : ''}
                        {formatRelative(t.updated_at)}
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
    </div>
  )
}
