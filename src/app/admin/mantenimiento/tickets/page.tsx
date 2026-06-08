export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminMaintenanceList } from '@/components/mantenimiento/admin-maintenance-list'
import { getAuthedProfile } from '@/lib/auth'

const PAGE_SIZE = 30

export default async function AdminMaintenanceTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; page?: string }>
}) {
  const params = await searchParams
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('maintenance_tickets')
    .select(`
      id, folio, type, status, servicio, descripcion,
      department_name_snapshot, area_name_snapshot, encargado_nombre,
      tecnico_nombre_snapshot, fecha_solicitud, created_at, updated_at,
      user:profiles!user_id(full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status) query = query.eq('status', params.status)
  if (params.type)   query = query.eq('type', params.type)

  const { data: tickets, count } = await query

  return (
    <AdminMaintenanceList
      tickets={(tickets ?? []) as unknown as Parameters<typeof AdminMaintenanceList>[0]['tickets']}
      currentFilters={params}
      page={page}
      totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
      totalCount={count ?? 0}
    />
  )
}
