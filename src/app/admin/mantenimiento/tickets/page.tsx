export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminMaintenanceList } from '@/components/mantenimiento/admin-maintenance-list'

export default async function AdminMaintenanceTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  let query = supabase
    .from('maintenance_tickets')
    .select(`
      id, folio, type, status, servicio, descripcion,
      department_name_snapshot, area_name_snapshot, encargado_nombre,
      tecnico_nombre_snapshot, fecha_solicitud, created_at, updated_at,
      user:profiles!user_id(full_name, email)
    `)
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.type)   query = query.eq('type', params.type)

  const { data: tickets } = await query

  return (
    <AdminMaintenanceList
      tickets={(tickets ?? []) as unknown as Parameters<typeof AdminMaintenanceList>[0]['tickets']}
      currentFilters={params}
    />
  )
}
