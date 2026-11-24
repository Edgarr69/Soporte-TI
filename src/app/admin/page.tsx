export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { homePathForRole, type Role } from '@/lib/types'
import { getAuthedProfile } from '@/lib/auth'
import {
  getCachedSistemasStats,
  getCachedMantenimientoStats,
  getCachedSeguridadStats,
  getCachedGeneralOpenItems,
} from '@/lib/admin-dashboard-cache'
import {
  GeneralOverview,
  type OpenSistemasItem,
  type OpenMantItem,
  type OpenSeguridadItem,
} from '@/components/admin/general-overview'

export default async function AdminRootPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  const role = (profile?.role ?? 'usuario') as Role

  // Si no es super_admin, redirigir a su módulo
  if (role !== 'super_admin') {
    redirect(homePathForRole(role))
  }

  const [sistemas, mant, seguridad, open] = await Promise.all([
    getCachedSistemasStats(),
    getCachedMantenimientoStats(),
    getCachedSeguridadStats(),
    getCachedGeneralOpenItems(),
  ])

  // Mantenimiento viene agregado por día (últimos 12 meses) — sumar todo
  const n = (v: unknown) => Number(v ?? 0)
  const mantTotals = mant.daily.reduce(
    (acc, d) => {
      acc.total       += n(d.total)
      acc.pendiente   += n(d.pendiente)
      acc.en_revision += n(d.en_revision)
      acc.asignado    += n(d.asignado)
      acc.en_proceso  += n(d.en_proceso)
      acc.terminado   += n(d.terminado)
      acc.cancelado   += n(d.cancelado)
      acc.resolSum    += n(d.resol_sum)
      acc.resolCount  += n(d.resol_count)
      return acc
    },
    { total: 0, pendiente: 0, en_revision: 0, asignado: 0, en_proceso: 0, terminado: 0, cancelado: 0, resolSum: 0, resolCount: 0 },
  )

  const s = sistemas.summary
  const avg = (v: number | null) => (v === null || v === undefined ? null : Math.round(Number(v)))

  return (
    <GeneralOverview
      sistemas={{
        total: n(s.total),
        abierto: n(s.abierto), en_proceso: n(s.en_proceso), en_espera: n(s.en_espera),
        reabierto: n(s.reabierto), resuelto: n(s.resuelto), cerrado: n(s.cerrado),
        critica: n(s.critica),
        avgResolution: avg(s.avg_resolution),
      }}
      mantenimiento={{
        total: mantTotals.total,
        pendiente: mantTotals.pendiente, en_revision: mantTotals.en_revision,
        asignado: mantTotals.asignado, en_proceso: mantTotals.en_proceso,
        terminado: mantTotals.terminado, cancelado: mantTotals.cancelado,
        avgResolution: mantTotals.resolCount ? Math.round(mantTotals.resolSum / mantTotals.resolCount) : null,
      }}
      seguridad={{
        total: seguridad.summary.total,
        pendiente: seguridad.summary.pendiente, en_revision: seguridad.summary.en_revision,
        en_proceso: seguridad.summary.en_proceso, terminado: seguridad.summary.terminado,
        cancelado: seguridad.summary.cancelado,
        abiertosCriticos: seguridad.summary.abiertos_criticos,
        avgResolution: avg(seguridad.summary.avg_resolution),
      }}
      openSistemas={open.sistemas as unknown as OpenSistemasItem[]}
      openMantenimiento={open.mantenimiento as unknown as OpenMantItem[]}
      openSeguridad={(seguridad.openTickets as unknown as OpenSeguridadItem[]).slice(0, 5)}
    />
  )
}
