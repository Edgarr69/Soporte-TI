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

export const getCachedAllMaintenanceTickets = unstable_cache(
  async () => {
    // El dashboard solo permite filtrar/graficar dentro de los últimos 12 meses,
    // así que acotamos la consulta a esa ventana — evita traer años de histórico
    // completo en cada revalidación a medida que crece el total de solicitudes
    const since = new Date()
    since.setMonth(since.getMonth() - 12)

    const { data } = await createAdminClient()
      .from('maintenance_tickets')
      .select('type, status, area_name_snapshot, department_name_snapshot, created_at, assignment_time_minutes, resolution_time_minutes, tecnico_nombre_snapshot')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
    return data ?? []
  },
  ['admin-mantenimiento-tickets-all'],
  { revalidate: 300, tags: ['admin-mantenimiento-tickets'] },
)
