import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Caches de datos agregados para dashboards/reportes admin.
 * Estas vistas recorren el historial completo de tickets para calcular
 * métricas — recalcularlas en cada visita es costoso y los números no
 * necesitan ser exactos al segundo, así que se cachean unos minutos.
 */

interface SistemasSummary {
  total: number
  abierto: number; en_proceso: number; en_espera: number
  resuelto: number; cerrado: number; reabierto: number
  critica: number; alta: number; media: number; baja: number
  reopened_count: number
  avg_first_response: number | null
  avg_resolution: number | null
}

const EMPTY_SUMMARY: SistemasSummary = {
  total: 0, abierto: 0, en_proceso: 0, en_espera: 0,
  resuelto: 0, cerrado: 0, reabierto: 0,
  critica: 0, alta: 0, media: 0, baja: 0,
  reopened_count: 0, avg_first_response: null, avg_resolution: null,
}

/**
 * Estadísticas del módulo sistemas calculadas vía funciones SQL agregadas
 * (`get_sistemas_*`, ver migración 009) en vez de traer todos los tickets
 * y recorrerlos en JS — la base de datos hace el trabajo pesado.
 */
export const getCachedSistemasStats = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [summaryRes, categoryRes, departmentRes, monthRes, topUsersRes, recentRes] = await Promise.all([
      admin.rpc('get_sistemas_ticket_summary'),
      admin.rpc('get_sistemas_by_category'),
      admin.rpc('get_sistemas_by_department'),
      admin.rpc('get_sistemas_by_month'),
      admin.rpc('get_sistemas_top_users', { p_limit: 10 }),
      admin
        .from('tickets')
        .select('id, folio, status, priority, created_at, ticket_categories(name), user:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    return {
      summary: (summaryRes.data?.[0] as SistemasSummary | undefined) ?? EMPTY_SUMMARY,
      byCategory: (categoryRes.data ?? []) as { name: string; total: number; critica: number }[],
      byDepartment: (departmentRes.data ?? []) as { name: string; total: number }[],
      byMonth: (monthRes.data ?? []) as { month: string; total: number }[],
      topUsers: (topUsersRes.data ?? []) as { email: string; full_name: string | null; total: number }[],
      recentTickets: recentRes.data ?? [],
    }
  },
  ['admin-sistemas-stats'],
  { revalidate: 300, tags: ['admin-sistemas-tickets'] },
)

export interface MantDailyRow {
  day: string
  total: number
  pendiente: number; en_revision: number; asignado: number
  en_proceso: number; terminado: number; cancelado: number
  general: number; maquinaria: number
  assign_sum: number; assign_count: number
  resol_sum: number; resol_count: number
}

export interface MantDayDimRow {
  day: string
  name: string
  total: number
}

/**
 * Estadísticas del dashboard de mantenimiento agregadas POR DÍA en SQL
 * (`get_mant_*`, ver migración 012) — el filtro por rango de fechas sigue
 * siendo instantáneo en el cliente, pero el payload queda acotado por
 * días × áreas/técnicos en vez de por número de solicitudes.
 */
export const getCachedMantenimientoStats = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [dailyRes, areaRes, tecnicoRes] = await Promise.all([
      admin.rpc('get_mant_daily_summary'),
      admin.rpc('get_mant_daily_by_area'),
      admin.rpc('get_mant_daily_by_tecnico'),
    ])
    // Si una RPC falla (p.ej. migración 012 sin aplicar) el dashboard se ve
    // vacío — dejar rastro en el log del servidor para poder diagnosticarlo
    for (const [fn, res] of [
      ['get_mant_daily_summary', dailyRes],
      ['get_mant_daily_by_area', areaRes],
      ['get_mant_daily_by_tecnico', tecnicoRes],
    ] as const) {
      if (res.error) console.error(`[getCachedMantenimientoStats] ${fn}:`, res.error.message)
    }
    return {
      daily:     (dailyRes.data ?? []) as MantDailyRow[],
      byArea:    (areaRes.data ?? []) as MantDayDimRow[],
      byTecnico: (tecnicoRes.data ?? []) as MantDayDimRow[],
    }
  },
  ['admin-mantenimiento-stats'],
  { revalidate: 300, tags: ['admin-mantenimiento-tickets'] },
)

export interface SeguridadSummary {
  total: number
  pendiente: number; en_revision: number; en_proceso: number
  terminado: number; cancelado: number
  bajo: number; medio: number; alto: number; critico: number
  abiertos_criticos: number
  avg_first_response: number | null
  avg_resolution: number | null
}

const EMPTY_SEGURIDAD: SeguridadSummary = {
  total: 0, pendiente: 0, en_revision: 0, en_proceso: 0, terminado: 0, cancelado: 0,
  bajo: 0, medio: 0, alto: 0, critico: 0, abiertos_criticos: 0,
  avg_first_response: null, avg_resolution: null,
}

/**
 * Estadísticas del módulo de Seguridad e Higiene (últimos 12 meses),
 * agregadas en SQL (`get_seguridad_*`, ver migración 013).
 */
export const getCachedSeguridadStats = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [summaryRes, categoryRes, areaRes, monthRes, recentRes, mantRes] = await Promise.all([
      admin.rpc('get_seguridad_summary'),
      admin.rpc('get_seguridad_by_category'),
      admin.rpc('get_seguridad_by_area'),
      admin.rpc('get_seguridad_by_month'),
      admin
        .from('seguridad_tickets')
        .select('id, folio, status, nivel_riesgo, category_name_snapshot, area_name_snapshot, created_at')
        .in('status', ['pendiente', 'en_revision', 'en_proceso'])
        .order('created_at', { ascending: false })
        .limit(8),
      admin.rpc('get_seguridad_mant_by_month'),
    ])
    for (const [fn, res] of [
      ['get_seguridad_summary', summaryRes],
      ['get_seguridad_by_category', categoryRes],
      ['get_seguridad_by_area', areaRes],
      ['get_seguridad_by_month', monthRes],
      ['get_seguridad_mant_by_month', mantRes],
    ] as const) {
      if (res.error) console.error(`[getCachedSeguridadStats] ${fn}:`, res.error.message)
    }

    const raw = summaryRes.data?.[0] as Record<string, number | string | null> | undefined
    // bigint/numeric llegan como string o number según el driver — normalizar
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
    const summary: SeguridadSummary = raw
      ? {
          total: num(raw.total) ?? 0,
          pendiente: num(raw.pendiente) ?? 0, en_revision: num(raw.en_revision) ?? 0,
          en_proceso: num(raw.en_proceso) ?? 0, terminado: num(raw.terminado) ?? 0,
          cancelado: num(raw.cancelado) ?? 0,
          bajo: num(raw.bajo) ?? 0, medio: num(raw.medio) ?? 0,
          alto: num(raw.alto) ?? 0, critico: num(raw.critico) ?? 0,
          abiertos_criticos: num(raw.abiertos_criticos) ?? 0,
          avg_first_response: num(raw.avg_first_response),
          avg_resolution: num(raw.avg_resolution),
        }
      : EMPTY_SEGURIDAD

    const toList = (rows: unknown) =>
      ((rows ?? []) as { name: string; total: number | string }[]).map((r) => ({ name: r.name, count: Number(r.total) }))

    return {
      summary,
      byCategory: toList(categoryRes.data),
      byArea:     toList(areaRes.data),
      byMonth:    ((monthRes.data ?? []) as { month: string; total: number | string }[])
                    .map((r) => ({ month: r.month, total: Number(r.total) })),
      openTickets: recentRes.data ?? [],
      mantByMonth: ((mantRes.data ?? []) as Record<string, number | string>[]).map((r) => ({
        month:       String(r.month),
        solicitados: Number(r.solicitados),
        aceptados:   Number(r.aceptados),
        rechazados:  Number(r.rechazados),
        terminados:  Number(r.terminados),
      })),
    }
  },
  ['admin-seguridad-stats'],
  { revalidate: 300, tags: ['admin-seguridad-tickets'] },
)
