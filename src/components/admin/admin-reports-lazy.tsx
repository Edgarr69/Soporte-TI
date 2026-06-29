'use client'

import dynamic from 'next/dynamic'

const AdminReportsViewDynamic = dynamic(
  () => import('./admin-reports').then((m) => m.AdminReportsView),
  { ssr: false }
)

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

export function AdminReportsViewLazy(props: Props) {
  return <AdminReportsViewDynamic {...props} />
}
