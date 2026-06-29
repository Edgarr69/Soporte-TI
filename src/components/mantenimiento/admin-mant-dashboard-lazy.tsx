'use client'

import dynamic from 'next/dynamic'

interface Ticket {
  type: string
  status: string
  area_name_snapshot: string | null
  department_name_snapshot: string | null
  created_at: string
  assignment_time_minutes: number | null
  resolution_time_minutes: number | null
  tecnico_nombre_snapshot: string | null
}

const AdminMantenimientoDashboardDynamic = dynamic(
  () => import('./admin-mant-dashboard').then((m) => m.AdminMantenimientoDashboard),
  { ssr: false }
)

export function AdminMantenimientoDashboardLazy({ tickets }: { tickets: Ticket[] }) {
  return <AdminMantenimientoDashboardDynamic tickets={tickets} />
}
