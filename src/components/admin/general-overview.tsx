import Link from 'next/link'
import { Monitor, Wrench, ShieldAlert, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { KpiCard } from '@/components/shared/kpi-card'
import { cn, formatRelative, minutesToHuman } from '@/lib/utils'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  SEGURIDAD_STATUS_LABELS, SEGURIDAD_STATUS_COLORS,
  NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS,
  type TicketStatus, type Priority, type MaintenanceStatus, type MaintenanceType,
  type SeguridadStatus, type NivelRiesgo,
} from '@/lib/types'

// ─── Tipos de entrada ─────────────────────────────────────

export interface OpenSistemasItem {
  id: string
  folio: string
  status: TicketStatus
  priority: Priority
  created_at: string
  ticket_categories: { name: string } | { name: string }[] | null
  user: { full_name: string | null } | { full_name: string | null }[] | null
}

export interface OpenMantItem {
  id: string
  folio: string
  status: MaintenanceStatus
  type: MaintenanceType
  servicio: string
  area_name_snapshot: string | null
  created_at: string
}

export interface OpenSeguridadItem {
  id: string
  folio: string
  status: SeguridadStatus
  nivel_riesgo: NivelRiesgo
  category_name_snapshot: string | null
  area_name_snapshot: string | null
  created_at: string
}

interface Props {
  sistemas: {
    total: number
    abierto: number; en_proceso: number; en_espera: number; reabierto: number
    resuelto: number; cerrado: number
    critica: number
    avgResolution: number | null
  }
  mantenimiento: {
    total: number
    pendiente: number; en_revision: number; asignado: number; en_proceso: number
    terminado: number; cancelado: number
    avgResolution: number | null
  }
  seguridad: {
    total: number
    pendiente: number; en_revision: number; en_proceso: number
    terminado: number; cancelado: number
    abiertosCriticos: number
    avgResolution: number | null
  }
  openSistemas: OpenSistemasItem[]
  openMantenimiento: OpenMantItem[]
  openSeguridad: OpenSeguridadItem[]
}

// ─── Helpers ──────────────────────────────────────────────

const first = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null)

type Segment = { label: string; value: number; bar: string }

function StatusBreakdown({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  return (
    <div className="space-y-2">
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {total > 0 && segments.map((s) =>
          s.value > 0 ? (
            <div key={s.label} className={s.bar} style={{ width: `${(s.value / total) * 100}%` }} />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
            <dt className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 truncate">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', s.bar)} aria-hidden="true" />
              {s.label}
            </dt>
            <dd className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

function ModuleCard({
  title, icon: Icon, href, total, avgResolution, segments, children, emptyText,
}: {
  title: string
  icon: React.ElementType
  href: string
  total: number
  avgResolution: number | null
  segments: Segment[]
  children: React.ReactNode[]
  emptyText: string
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            {title}
          </CardTitle>
          <LinkButton href={href} variant="ghost" size="sm" className="gap-1 text-xs">
            Ver módulo <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </LinkButton>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <span><span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{total}</span> en total</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Resolución prom.: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{minutesToHuman(avgResolution)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <StatusBreakdown segments={segments} />
        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">Pendientes recientes</p>
          {children.length ? (
            <ul className="space-y-1">{children}</ul>
          ) : (
            <p className="text-xs text-zinc-400 py-4 text-center">{emptyText}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ItemRow({ href, folio, title, meta, pills }: {
  href: string; folio: string; title: string; meta: string; pills: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            <span className="font-mono text-xs text-zinc-500 mr-1.5">{folio}</span>
            {title}
          </p>
          <p className="text-[11px] text-zinc-400 truncate">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">{pills}</div>
      </Link>
    </li>
  )
}

// ─── Vista ────────────────────────────────────────────────

export function GeneralOverview({
  sistemas, mantenimiento, seguridad, openSistemas, openMantenimiento, openSeguridad,
}: Props) {
  const sisAbiertos   = sistemas.abierto + sistemas.en_proceso + sistemas.en_espera + sistemas.reabierto
  const mantPorAtender = mantenimiento.pendiente + mantenimiento.en_revision
  const mantEnCurso    = mantenimiento.asignado + mantenimiento.en_proceso
  const segAbiertos    = seguridad.pendiente + seguridad.en_revision + seguridad.en_proceso

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Panel general</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Resumen de Sistemas, Mantenimiento y Seguridad e Higiene. Las cifras se actualizan cada pocos minutos.
        </p>
      </header>

      {/* ─── Requieren atención ─── */}
      <section aria-label="Indicadores principales" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Sistemas abiertos"
          value={sisAbiertos}
          icon={<Monitor className="h-3.5 w-3.5 text-zinc-400" />}
          description="Abiertos, en proceso, en espera o reabiertos"
        />
        <KpiCard
          label="Mantenimiento por atender"
          value={mantPorAtender}
          icon={<Wrench className="h-3.5 w-3.5 text-zinc-400" />}
          valueColor={mantPorAtender ? 'text-amber-600 dark:text-amber-400' : undefined}
          description="Pendientes o en revisión"
        />
        <KpiCard
          label="Mantenimiento en curso"
          value={mantEnCurso}
          icon={<Wrench className="h-3.5 w-3.5 text-zinc-400" />}
          description="Asignadas o en proceso"
        />
        <KpiCard
          label="Seguridad abiertos"
          value={segAbiertos}
          icon={seguridad.abiertosCriticos
            ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            : <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" />}
          valueColor={seguridad.abiertosCriticos ? 'text-red-600 dark:text-red-400' : undefined}
          description={seguridad.abiertosCriticos
            ? `${seguridad.abiertosCriticos} de riesgo crítico`
            : 'Sin riesgos críticos abiertos'}
        />
      </section>

      {/* ─── Módulos ─── */}
      <section aria-label="Módulos" className="grid gap-4 lg:grid-cols-3">
        <ModuleCard
          title="Sistemas"
          icon={Monitor}
          href="/admin/sistemas"
          total={sistemas.total}
          avgResolution={sistemas.avgResolution}
          emptyText="Sin tickets abiertos"
          segments={[
            { label: STATUS_LABELS.abierto,    value: sistemas.abierto,    bar: 'bg-blue-500'   },
            { label: STATUS_LABELS.en_proceso, value: sistemas.en_proceso, bar: 'bg-amber-500'  },
            { label: STATUS_LABELS.en_espera,  value: sistemas.en_espera,  bar: 'bg-orange-500' },
            { label: STATUS_LABELS.reabierto,  value: sistemas.reabierto,  bar: 'bg-purple-500' },
            { label: STATUS_LABELS.resuelto,   value: sistemas.resuelto,   bar: 'bg-green-500'  },
            { label: STATUS_LABELS.cerrado,    value: sistemas.cerrado,    bar: 'bg-zinc-400'   },
          ]}
        >
          {openSistemas.map((t) => (
            <ItemRow
              key={t.id}
              href={`/admin/sistemas/tickets/${t.id}`}
              folio={t.folio}
              title={first(t.ticket_categories)?.name ?? 'Ticket'}
              meta={`${first(t.user)?.full_name ?? 'Usuario'} · ${formatRelative(t.created_at)}`}
              pills={<>
                <Pill className={STATUS_COLORS[t.status]}>{STATUS_LABELS[t.status]}</Pill>
                <Pill className={PRIORITY_COLORS[t.priority]}>{PRIORITY_LABELS[t.priority]}</Pill>
              </>}
            />
          ))}
        </ModuleCard>

        <ModuleCard
          title="Mantenimiento"
          icon={Wrench}
          href="/admin/mantenimiento"
          total={mantenimiento.total}
          avgResolution={mantenimiento.avgResolution}
          emptyText="Sin solicitudes abiertas"
          segments={[
            { label: MAINTENANCE_STATUS_LABELS.pendiente,   value: mantenimiento.pendiente,   bar: 'bg-yellow-500' },
            { label: MAINTENANCE_STATUS_LABELS.en_revision, value: mantenimiento.en_revision, bar: 'bg-blue-500'   },
            { label: MAINTENANCE_STATUS_LABELS.asignado,    value: mantenimiento.asignado,    bar: 'bg-indigo-500' },
            { label: MAINTENANCE_STATUS_LABELS.en_proceso,  value: mantenimiento.en_proceso,  bar: 'bg-amber-500'  },
            { label: MAINTENANCE_STATUS_LABELS.terminado,   value: mantenimiento.terminado,   bar: 'bg-green-500'  },
            { label: MAINTENANCE_STATUS_LABELS.cancelado,   value: mantenimiento.cancelado,   bar: 'bg-zinc-400'   },
          ]}
        >
          {openMantenimiento.map((t) => (
            <ItemRow
              key={t.id}
              href={`/admin/mantenimiento/tickets/${t.id}`}
              folio={t.folio}
              title={t.servicio}
              meta={`${t.type === 'maquinaria' ? 'Maquinaria' : 'General'}${t.area_name_snapshot ? ` · ${t.area_name_snapshot}` : ''} · ${formatRelative(t.created_at)}`}
              pills={<Pill className={MAINTENANCE_STATUS_COLORS[t.status]}>{MAINTENANCE_STATUS_LABELS[t.status]}</Pill>}
            />
          ))}
        </ModuleCard>

        <ModuleCard
          title="Seguridad e Higiene"
          icon={ShieldAlert}
          href="/admin/seguridad"
          total={seguridad.total}
          avgResolution={seguridad.avgResolution}
          emptyText="Sin reportes abiertos"
          segments={[
            { label: SEGURIDAD_STATUS_LABELS.pendiente,   value: seguridad.pendiente,   bar: 'bg-yellow-500' },
            { label: SEGURIDAD_STATUS_LABELS.en_revision, value: seguridad.en_revision, bar: 'bg-blue-500'   },
            { label: SEGURIDAD_STATUS_LABELS.en_proceso,  value: seguridad.en_proceso,  bar: 'bg-amber-500'  },
            { label: SEGURIDAD_STATUS_LABELS.terminado,   value: seguridad.terminado,   bar: 'bg-green-500'  },
            { label: SEGURIDAD_STATUS_LABELS.cancelado,   value: seguridad.cancelado,   bar: 'bg-zinc-400'   },
          ]}
        >
          {openSeguridad.map((t) => (
            <ItemRow
              key={t.id}
              href={`/admin/seguridad/tickets/${t.id}`}
              folio={t.folio}
              title={t.category_name_snapshot ?? 'Reporte'}
              meta={`${t.area_name_snapshot ?? 'Sin área'} · ${formatRelative(t.created_at)}`}
              pills={<>
                <Pill className={SEGURIDAD_STATUS_COLORS[t.status]}>{SEGURIDAD_STATUS_LABELS[t.status]}</Pill>
                <Pill className={NIVEL_RIESGO_COLORS[t.nivel_riesgo]}>{NIVEL_RIESGO_LABELS[t.nivel_riesgo]}</Pill>
              </>}
            />
          ))}
        </ModuleCard>
      </section>
    </div>
  )
}
