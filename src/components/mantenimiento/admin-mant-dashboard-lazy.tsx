'use client'

import dynamic from 'next/dynamic'
import type { MantDailyRow, MantDayDimRow } from '@/lib/admin-dashboard-cache'

interface Stats {
  daily:     MantDailyRow[]
  byArea:    MantDayDimRow[]
  byTecnico: MantDayDimRow[]
}

const AdminMantenimientoDashboardDynamic = dynamic(
  () => import('./admin-mant-dashboard').then((m) => m.AdminMantenimientoDashboard),
  { ssr: false }
)

export function AdminMantenimientoDashboardLazy({ stats }: { stats: Stats }) {
  return <AdminMantenimientoDashboardDynamic stats={stats} />
}
