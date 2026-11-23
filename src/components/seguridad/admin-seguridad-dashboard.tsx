import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/shared/kpi-card'
import { HorizontalBarList, VerticalBarChart } from '@/components/shared/charts'
import { LinkButton } from '@/components/ui/link-button'
import {
  SEGURIDAD_STATUS_LABELS, SEGURIDAD_STATUS_COLORS,
  NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS,
  type SeguridadStatus, type NivelRiesgo,
} from '@/lib/types'
import { cn, formatRelative, minutesToHuman } from '@/lib/utils'
import type { SeguridadSummary } from '@/lib/admin-dashboard-cache'
import { AlertTriangle, CheckCircle2, Clock, List, ShieldAlert, Timer, Wrench } from 'lucide-react'

interface OpenTicket {
  id: string
  folio: string
  status: string
  nivel_riesgo: string
  category_name_snapshot: string | null
  area_name_snapshot: string | null
  created_at: string
}

interface Props {
  summary: SeguridadSummary
  byCategory: { name: string; count: number }[]
  byArea: { name: string; count: number }[]
  byMonth: { month: string; total: number }[]
  openTickets: OpenTicket[]
  mantByMonth: MantMonth[]
}

interface MantMonth {
  month: string
  solicitados: number
  aceptados: number
  rechazados: number
  terminados: number
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const RIESGO_BAR: Record<NivelRiesgo, string> = {
  bajo:    'bg-zinc-400',
  medio:   'bg-blue-500',
  alto:    'bg-orange-500',
  critico: 'bg-red-600',
}

export function AdminSeguridadDashboard({ summary, byCategory, byArea, byMonth, openTickets, mantByMonth }: Props) {
  const abiertos = summary.pendiente + summary.en_revision + summary.en_proceso
  const riesgoTotal = Math.max(summary.bajo + summary.medio + summary.alto + summary.critico, 1)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Seguridad e Higiene</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Últimos 12 meses</p>
        </div>
        <LinkButton href="/admin/seguridad/tickets?status=abiertos" size="sm">Ver reportes abiertos</LinkButton>
      </div>

      {summary.abiertos_criticos > 0 && (
        <Link href="/admin/seguridad/tickets?status=abiertos&riesgo=critico" className="block">
          <div className="flex items-center gap-3 rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">
              <span className="font-semibold">{summary.abiertos_criticos}</span>{' '}
              {summary.abiertos_criticos === 1 ? 'reporte de riesgo alto o crítico sigue' : 'reportes de riesgo alto o crítico siguen'} sin atender.
            </p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total reportes" value={summary.total} icon={<List className="h-3.5 w-3.5 text-zinc-400" />} />
        <KpiCard label="Abiertos" value={abiertos} icon={<Clock className="h-3.5 w-3.5 text-amber-500" />}
          valueColor="text-amber-600 dark:text-amber-400"
          description={`${summary.pendiente} pendientes · ${summary.en_revision} en revisión`} />
        <KpiCard label="Atendidos" value={summary.terminado} icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          valueColor="text-green-600 dark:text-green-400" />
        <KpiCard label="Riesgo crítico" value={summary.critico} icon={<ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
          valueColor="text-red-600 dark:text-red-400" />
        <KpiCard label="1ª respuesta promedio" value={minutesToHuman(summary.avg_first_response)}
          icon={<Timer className="h-3.5 w-3.5 text-zinc-400" />} />
        <KpiCard label="Atención promedio" value={minutesToHuman(summary.avg_resolution)}
          icon={<Timer className="h-3.5 w-3.5 text-zinc-400" />} />
        <KpiCard label="En atención" value={summary.en_proceso} icon={<Clock className="h-3.5 w-3.5 text-blue-500" />} />
        <KpiCard label="Cancelados" value={summary.cancelado} icon={<List className="h-3.5 w-3.5 text-zinc-400" />} />
      </div>

      <MantChart data={mantByMonth} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Reportes por mes</CardTitle></CardHeader>
          <CardContent>
            <VerticalBarChart
              data={byMonth.map((m) => ({ label: MONTHS[Number(m.month.slice(5, 7)) - 1] ?? m.month, value: m.total }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Nivel de riesgo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(['critico', 'alto', 'medio', 'bajo'] as NivelRiesgo[]).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-sm text-zinc-700 dark:text-zinc-300 w-16 shrink-0">{NIVEL_RIESGO_LABELS[n]}</span>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div className={cn('h-full rounded-full', RIESGO_BAR[n])}
                    style={{ width: `${(summary[n] / riesgoTotal) * 100}%` }} />
                </div>
                <span className="text-sm font-semibold text-zinc-500 w-8 text-right tabular-nums">{summary[n]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por categoría</CardTitle></CardHeader>
          <CardContent><HorizontalBarList data={byCategory.slice(0, 8)} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por área</CardTitle></CardHeader>
          <CardContent><HorizontalBarList data={byArea.slice(0, 8)} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Reportes abiertos recientes</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {openTickets.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No hay reportes abiertos.</p>
          ) : openTickets.map((t) => (
            <Link key={t.id} href={`/admin/seguridad/tickets/${t.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <span className="text-xs font-mono text-zinc-400 w-24 shrink-0">{t.folio}</span>
              <span className="text-sm flex-1 min-w-0 truncate">
                {t.category_name_snapshot ?? '—'}
                <span className="text-zinc-400"> · {t.area_name_snapshot ?? '—'}</span>
              </span>
              <span className="text-xs text-zinc-400 hidden sm:inline">{formatRelative(t.created_at)}</span>
              <Badge className={cn('text-xs', NIVEL_RIESGO_COLORS[t.nivel_riesgo as NivelRiesgo])}>
                {NIVEL_RIESGO_LABELS[t.nivel_riesgo as NivelRiesgo]}
              </Badge>
              <Badge className={cn('text-xs hidden sm:inline-flex', SEGURIDAD_STATUS_COLORS[t.status as SeguridadStatus])}>
                {SEGURIDAD_STATUS_LABELS[t.status as SeguridadStatus]}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Reportes pasados a Mantenimiento ────────────────────

const MANT_SERIES = [
  { key: 'aceptados',  label: 'Aceptados',  color: 'bg-indigo-500' },
  { key: 'rechazados', label: 'Rechazados', color: 'bg-red-400' },
  { key: 'terminados', label: 'Terminados por Mant.', color: 'bg-green-500' },
] as const

function MantChart({ data }: { data: MantMonth[] }) {
  const tot = data.reduce(
    (a, m) => ({
      solicitados: a.solicitados + m.solicitados, aceptados: a.aceptados + m.aceptados,
      rechazados: a.rechazados + m.rechazados, terminados: a.terminados + m.terminados,
    }),
    { solicitados: 0, aceptados: 0, rechazados: 0, terminados: 0 },
  )
  const max = Math.max(...data.map((m) => m.solicitados), 1)
  const BAR_H = 120

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Wrench className="h-4 w-4" />
          Reportes pasados a Mantenimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Solicitados" value={tot.solicitados} />
          <MiniStat label="Aceptados"  value={tot.aceptados}  dot="bg-indigo-500" />
          <MiniStat label="Rechazados" value={tot.rechazados} dot="bg-red-400" />
          <MiniStat label="Terminados por Mant." value={tot.terminados} dot="bg-green-500" />
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">Aún no se han pasado reportes a Mantenimiento.</p>
        ) : (
          <div className="space-y-2" role="img"
            aria-label={`Reportes pasados a Mantenimiento por mes: ${data.map((m) => `${m.month} ${m.solicitados}`).join(', ')}`}>
            <div className="flex items-end gap-3" style={{ height: BAR_H }}>
              {data.map((m) => (
                <div key={m.month} className="flex-1 flex items-end justify-center gap-0.5 min-w-0 h-full"
                  title={`${m.month}: ${m.solicitados} solicitados, ${m.aceptados} aceptados, ${m.rechazados} rechazados, ${m.terminados} terminados`}>
                  {MANT_SERIES.map((s) => {
                    const v = m[s.key]
                    return (
                      <div key={s.key} className="flex-1 max-w-4 flex flex-col items-center justify-end h-full">
                        {v > 0 && <span className="text-[9px] text-zinc-500 tabular-nums">{v}</span>}
                        <div className={cn('w-full rounded-t', s.color)}
                          style={{ height: Math.max((v / max) * (BAR_H - 14), v > 0 ? 4 : 0) }} />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              {data.map((m) => (
                <span key={m.month} className="flex-1 text-[10px] text-zinc-400 text-center truncate">
                  {MONTHS[Number(m.month.slice(5, 7)) - 1] ?? m.month}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {MANT_SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className={cn('h-2 w-2 rounded-sm', s.color)} aria-hidden="true" />{s.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
      <p className="text-xs text-zinc-500 flex items-center gap-1.5">
        {dot && <span className={cn('h-2 w-2 rounded-sm', dot)} aria-hidden="true" />}{label}
      </p>
      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</p>
    </div>
  )
}
