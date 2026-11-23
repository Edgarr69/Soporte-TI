'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  SEGURIDAD_STATUS_LABELS, SEGURIDAD_STATUS_COLORS,
  NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS,
  type SeguridadStatus, type NivelRiesgo,
} from '@/lib/types'
import { cn, formatRelative } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'
import { PaginationBar } from '@/components/shared/pagination-bar'

interface TicketRow {
  id: string
  folio: string
  status: string
  nivel_riesgo: string
  category_name_snapshot: string | null
  department_name_snapshot: string | null
  area_name_snapshot: string | null
  ubicacion: string
  created_at: string
  updated_at: string
  user: { full_name: string | null; email: string } | null
}

interface Props {
  tickets: TicketRow[]
  currentFilters: { status?: string; riesgo?: string }
  page: number
  totalPages: number
  totalCount: number
}

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos' },
  { value: 'abiertos',    label: 'Abiertos' },
  { value: 'pendiente',   label: 'Pendiente' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'en_proceso',  label: 'En atención' },
  { value: 'terminado',   label: 'Atendido' },
  { value: 'cancelado',   label: 'Cancelado' },
]

const RIESGO_OPTIONS = [
  { value: '',        label: 'Todo riesgo' },
  { value: 'critico', label: 'Crítico' },
  { value: 'alto',    label: 'Alto' },
  { value: 'medio',   label: 'Medio' },
  { value: 'bajo',    label: 'Bajo' },
]

export function AdminSeguridadList({ tickets, currentFilters, page, totalPages, totalCount }: Props) {
  const router = useRouter()
  const path   = usePathname()

  function setFilter(key: 'status' | 'riesgo', value: string) {
    const sp = new URLSearchParams()
    if (key !== 'status' && currentFilters.status) sp.set('status', currentFilters.status)
    if (key !== 'riesgo' && currentFilters.riesgo) sp.set('riesgo', currentFilters.riesgo)
    if (value) sp.set(key, value)
    router.push(`${path}?${sp.toString()}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        Reportes de seguridad e higiene
        <span className="ml-2 text-sm font-normal text-zinc-400">({totalCount})</span>
      </h1>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={(currentFilters.status ?? '') === opt.value}
            onClick={() => setFilter('status', opt.value)}
            activeClass="bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
          >
            {opt.label}
          </FilterChip>
        ))}
        <div className="w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
        {RIESGO_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            active={(currentFilters.riesgo ?? '') === opt.value}
            onClick={() => setFilter('riesgo', opt.value)}
            activeClass="bg-emerald-600 text-white border-emerald-600"
          >
            {opt.label}
          </FilterChip>
        ))}
      </div>

      {tickets.length === 0 ? (
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin reportes con estos filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/seguridad/tickets/${t.id}`} className="block">
              <Card className={cn(
                'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors',
                t.nivel_riesgo === 'critico' && ['pendiente', 'en_revision', 'en_proceso'].includes(t.status) &&
                  'border-l-4 border-l-red-600 dark:border-l-red-600',
              )}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                        <span className="text-sm font-semibold truncate">{t.category_name_snapshot ?? 'Sin categoría'}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">
                        {t.area_name_snapshot ?? '—'} · {t.ubicacion}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {t.user?.full_name ?? t.user?.email ?? '—'}
                        {t.department_name_snapshot ? ` · ${t.department_name_snapshot}` : ''}
                        {' · '}{formatRelative(t.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge className={cn('text-xs', SEGURIDAD_STATUS_COLORS[t.status as SeguridadStatus])}>
                        {SEGURIDAD_STATUS_LABELS[t.status as SeguridadStatus] ?? t.status}
                      </Badge>
                      <Badge className={cn('text-xs', NIVEL_RIESGO_COLORS[t.nivel_riesgo as NivelRiesgo])}>
                        {NIVEL_RIESGO_LABELS[t.nivel_riesgo as NivelRiesgo] ?? t.nivel_riesgo}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PaginationBar page={page} totalPages={totalPages} />
    </div>
  )
}

function FilterChip({
  active, onClick, activeClass, children,
}: {
  active: boolean
  onClick: () => void
  activeClass: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'text-xs px-3 py-1.5 rounded-full border transition-colors',
        active
          ? activeClass
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500',
      )}
    >
      {children}
    </button>
  )
}
