'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { minutesToHuman } from '@/lib/utils'

const PIE_COLORS = ['#ef4444', '#f59e0b', '#38bdf8', '#a1a1aa']

interface Props {
  monthly: { month: string; count: number }[]
  byCategory: { name: string; total: number; critica: number }[]
  byPriority: { name: string; count: number }[]
  byDepartment: { name: string; count: number }[]
  topUsers: { email: string; name: string; count: number }[]
  avgFirstResponse: number | null
  avgResolution: number | null
  totalTickets: number
  reopenedCount: number
  criticalPercent: number
}

export function AdminReportsView({
  monthly, byCategory, byPriority, byDepartment, topUsers,
  avgFirstResponse, avgResolution, totalTickets, reopenedCount, criticalPercent,
}: Props) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const gridColor = isDark ? '#27272a' : '#f4f4f5'
  const textColor = isDark ? '#a1a1aa' : '#71717a'

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Reportes y métricas</h1>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total tickets"     value={totalTickets.toString()} />
        <StatCard label="T. prom. 1ª resp." value={minutesToHuman(avgFirstResponse)} />
        <StatCard label="T. prom. resolución" value={minutesToHuman(avgResolution)} />
        <StatCard label="Tickets reabiertos" value={reopenedCount.toString()} />
        <StatCard label="% Críticos"        value={criticalPercent + '%'} />
      </div>

      {/* Tendencia mensual */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tendencia mensual de tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: textColor }} />
              <YAxis tick={{ fontSize: 11, fill: textColor }} />
              <Tooltip contentStyle={{ background: isDark ? '#18181b' : '#fff', border: `1px solid ${gridColor}` }} />
              <Line type="monotone" dataKey="count" stroke={isDark ? '#e4e4e7' : '#18181b'} strokeWidth={2} dot={{ r: 3 }} name="Tickets" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por prioridad (pie) */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tickets por prioridad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byPriority} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {byPriority.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} formatter={(value) => <span style={{ color: textColor, fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por categoría */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tickets por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis tick={{ fontSize: 11, fill: textColor }} />
                <Tooltip contentStyle={{ background: isDark ? '#18181b' : '#fff', border: `1px solid ${gridColor}` }} />
                <Bar dataKey="total" name="Total" fill={isDark ? '#e4e4e7' : '#18181b'} radius={[3, 3, 0, 0]} />
                <Bar dataKey="critica" name="Críticos" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por departamento */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tickets por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {byDepartment.slice(0, 10).map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 w-28 truncate shrink-0">{d.name}</span>
                  <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-zinc-900 dark:bg-zinc-100 h-2 rounded-full"
                      style={{ width: `${(d.count / (byDepartment[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right shrink-0">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top usuarios */}
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Usuarios que más levantan tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topUsers.slice(0, 8)}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fontSize: 11, fill: textColor }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: textColor }} width={96} />
                <Tooltip contentStyle={{ background: isDark ? '#18181b' : '#fff', border: `1px solid ${gridColor}` }} />
                <Bar dataKey="count" fill={isDark ? '#e4e4e7' : '#18181b'} radius={[0, 3, 3, 0]} name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      </CardContent>
    </Card>
  )
}
