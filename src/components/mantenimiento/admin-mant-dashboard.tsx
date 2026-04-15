'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { NumberTicker } from '@/components/ui/number-ticker'
import { cn } from '@/lib/utils'
import {
  AlertCircle, CheckCircle2, Clock, List,
  XCircle, Users, TrendingUp, Calendar, Wrench,
} from 'lucide-react'
import { MAINTENANCE_STATUS_LABELS } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string
  type: string
  status: string
  area_name_snapshot: string | null
  department_name_snapshot: string | null
  created_at: string
  assignment_time_minutes: number | null
  resolution_time_minutes: number | null
  tecnico_nombre_snapshot: string | null
}

interface Props { tickets: Ticket[] }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pendiente:   '#eab308',
  en_revision: '#0ea5e9',
  asignado:    '#6366f1',
  en_proceso:  '#f59e0b',
  terminado:   '#22c55e',
  cancelado:   '#ef4444',
}

const AREA_PALETTE  = ['#6366f1','#818cf8','#a5b4fc','#38bdf8','#7dd3fc','#bae6fd','#34d399']
const TEC_PALETTE   = ['#10b981','#34d399','#6ee7b7','#059669','#047857','#065f46','#064e3b']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function calcAvg(vals: (number | null)[]): number | null {
  const v = vals.filter((x): x is number => x !== null)
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null
}

function fmtMinutes(minutes: number | null): { value: number; unit: string } | null {
  if (minutes === null) return null
  if (minutes >= 60) return { value: Math.round((minutes / 60) * 10) / 10, unit: 'h' }
  return { value: minutes, unit: 'min' }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminMantenimientoDashboard({ tickets }: Props) {
  const today = todayStr()
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate,   setToDate]   = useState(today)

  function handleFromChange(val: string) {
    setFromDate(val)
    if (val > toDate) setToDate(val)
  }

  function handleToChange(val: string) {
    if (val >= fromDate) setToDate(val)
  }

  // ── Filtered data ────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    tickets.filter((t) => {
      const d = t.created_at.slice(0, 10)
      return d >= fromDate && d <= toDate
    }),
  [tickets, fromDate, toDate])

  // ── KPIs ────────────────────────────────────────────────────────────────
  const total      = filtered.length
  const pendiente  = filtered.filter((t) => t.status === 'pendiente').length
  const activos    = filtered.filter((t) => ['en_revision','asignado','en_proceso'].includes(t.status)).length
  const terminado  = filtered.filter((t) => t.status === 'terminado').length
  const cancelado  = filtered.filter((t) => t.status === 'cancelado').length
  const general    = filtered.filter((t) => t.type === 'general').length
  const maquinaria = filtered.filter((t) => t.type === 'maquinaria').length

  const avgAssignment = calcAvg(filtered.map((t) => t.assignment_time_minutes))
  const avgResolution = calcAvg(filtered.map((t) => t.resolution_time_minutes))

  // ── Trend (daily) ────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const map = new Map<string, number>()
    const start = new Date(fromDate + 'T12:00:00')
    const end   = new Date(toDate   + 'T12:00:00')
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      map.set(d.toISOString().split('T')[0], 0)
    }
    filtered.forEach((t) => {
      const d = t.created_at.slice(0, 10)
      map.set(d, (map.get(d) ?? 0) + 1)
    })
    return [...map.entries()].map(([date, count]) => ({
      date: date.slice(5).replace('-', '/'),
      count,
    }))
  }, [filtered, fromDate, toDate])

  // ── By status (donut) ────────────────────────────────────────────────────
  const statusData = useMemo(() =>
    Object.entries(MAINTENANCE_STATUS_LABELS)
      .map(([status, label]) => ({
        status, label,
        value: filtered.filter((t) => t.status === status).length,
        color: STATUS_COLORS[status] ?? '#94a3b8',
      }))
      .filter((d) => d.value > 0),
  [filtered])

  // ── By area ──────────────────────────────────────────────────────────────
  const areaData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((t) => {
      const k = t.area_name_snapshot ?? 'Sin área'
      map.set(k, (map.get(k) ?? 0) + 1)
    })
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }))
  }, [filtered])

  // ── By technician ────────────────────────────────────────────────────────
  const tecData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach((t) => {
      if (!t.tecnico_nombre_snapshot) return
      map.set(t.tecnico_nombre_snapshot, (map.get(t.tecnico_nombre_snapshot) ?? 0) + 1)
    })
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }))
  }, [filtered])

  const assignFmt = fmtMinutes(avgAssignment)
  const resolFmt  = fmtMinutes(avgResolution)
  const generalPct    = total > 0 ? Math.round((general    / total) * 100) : 0
  const maquinariaPct = total > 0 ? Math.round((maquinaria / total) * 100) : 0

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* ── Header + Date filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Dashboard Mantenimiento
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromChange(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-zinc-400 text-sm select-none">—</span>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => handleToChange(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total"       value={total}     icon={<List        className="h-4 w-4 text-zinc-400"   />} />
        <KpiCard label="Pendientes"  value={pendiente}  icon={<AlertCircle className="h-4 w-4 text-yellow-500" />} valueColor="text-yellow-500" />
        <KpiCard label="En proceso"  value={activos}    icon={<Clock       className="h-4 w-4 text-indigo-500" />} valueColor="text-indigo-500" />
        <KpiCard label="Terminados"  value={terminado}  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} valueColor="text-green-500" />
        <KpiCard label="Cancelados"  value={cancelado}  icon={<XCircle     className="h-4 w-4 text-red-500"    />} valueColor="text-red-500" />
        <KpiCard label="Maquinaria"  value={maquinaria} icon={<Wrench      className="h-4 w-4 text-purple-500" />} valueColor="text-purple-500" />
      </div>

      {/* ── Avg times ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Tiempo prom. asignación</p>
            {assignFmt
              ? <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-baseline gap-1">
                  <NumberTicker value={assignFmt.value} decimalPlaces={assignFmt.unit === 'h' ? 1 : 0} />
                  <span className="text-sm font-normal text-zinc-400">{assignFmt.unit}</span>
                </p>
              : <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">—</p>
            }
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs text-zinc-400 mb-1">Tiempo prom. resolución</p>
            {resolFmt
              ? <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-baseline gap-1">
                  <NumberTicker value={resolFmt.value} decimalPlaces={resolFmt.unit === 'h' ? 1 : 0} />
                  <span className="text-sm font-normal text-zinc-400">{resolFmt.unit}</span>
                </p>
              : <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">—</p>
            }
          </CardContent>
        </Card>
      </div>

      {/* ── Row 1: Trend + Status donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Trend — 3 cols */}
        <Card className="lg:col-span-3 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              Solicitudes por día
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {trendData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickLine={false} axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#a1a1aa' }}
                    tickLine={false} axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}
                    formatter={(v) => [v as number, 'Solicitudes']}
                  />
                  <Area
                    type="monotone" dataKey="count"
                    stroke="#6366f1" strokeWidth={2}
                    fill="url(#trendGrad)"
                    dot={false} activeDot={{ r: 4, fill: '#6366f1' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        {/* Status donut — 2 cols */}
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Por estado</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusData} dataKey="value" nameKey="label"
                      cx="50%" cy="50%" innerRadius={44} outerRadius={64}
                      paddingAngle={2} strokeWidth={0}
                    >
                      {statusData.map((e) => <Cell key={e.status} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                      formatter={(v, n) => [v as number, String(n)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {statusData.map((d) => (
                    <div key={d.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-zinc-500 dark:text-zinc-400">{d.label}</span>
                      </div>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: By area + By technician ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <List className="h-4 w-4 text-sky-500" />
              Solicitudes por área
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={areaData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                    formatter={(v) => [v as number, 'Solicitudes']}
                  />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                    {areaData.map((_, i) => <Cell key={i} fill={AREA_PALETTE[i % AREA_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              Carga por técnico
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {tecData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={tecData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: '#71717a' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                    formatter={(v) => [v as number, 'Asignadas']}
                  />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                    {tecData.map((_, i) => <Cell key={i} fill={TEC_PALETTE[i % TEC_PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Type breakdown ── */}
      <div className="grid grid-cols-2 gap-3">
        <TypeCard label="General (Edificio)" value={general} pct={generalPct} color="bg-sky-500" />
        <TypeCard label="Maquinaria"          value={maquinaria} pct={maquinariaPct} color="bg-purple-500" />
      </div>

    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, valueColor }: {
  label: string; value: number; icon: React.ReactNode; valueColor?: string
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-1">
          {icon}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
        </div>
        <NumberTicker
          value={value}
          className={cn('text-2xl sm:text-3xl font-bold', valueColor ?? 'text-zinc-900 dark:text-zinc-50')}
        />
      </CardContent>
    </Card>
  )
}

function TypeCard({ label, value, pct, color }: {
  label: string; value: number; pct: number; color: string
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">{value}</p>
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-zinc-400 mt-1">{pct}% del total</p>
      </CardContent>
    </Card>
  )
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-24 text-xs text-zinc-400">
      Sin datos para el rango seleccionado
    </div>
  )
}
