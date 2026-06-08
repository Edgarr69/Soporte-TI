import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Caches de datos agregados para dashboards/reportes admin.
 * Estas vistas recorren el historial completo de tickets para calcular
 * métricas — recalcularlas en cada visita es costoso y los números no
 * necesitan ser exactos al segundo, así que se cachean unos minutos.
 */

export const getCachedAllSistemasTickets = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from('tickets')
      .select(`
        id, folio, status, priority, is_reopened, created_at,
        first_response_time_minutes, resolution_time_minutes,
        ticket_categories(name),
        department:departments(name),
        user:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
    return data ?? []
  },
  ['admin-sistemas-tickets-all'],
  { revalidate: 300, tags: ['admin-sistemas-tickets'] },
)

export const getCachedAllMaintenanceTickets = unstable_cache(
  async () => {
    const { data } = await createAdminClient()
      .from('maintenance_tickets')
      .select('id, type, status, area_name_snapshot, department_name_snapshot, created_at, assignment_time_minutes, resolution_time_minutes, tecnico_nombre_snapshot')
      .order('created_at', { ascending: true })
    return data ?? []
  },
  ['admin-mantenimiento-tickets-all'],
  { revalidate: 300, tags: ['admin-mantenimiento-tickets'] },
)
