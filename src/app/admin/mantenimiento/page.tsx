export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminMantenimientoDashboard } from '@/components/mantenimiento/admin-mant-dashboard'

export default async function AdminMantenimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const { data: all } = await supabase
    .from('maintenance_tickets')
    .select('id, type, status, area_name_snapshot, department_name_snapshot, created_at, assignment_time_minutes, resolution_time_minutes, tecnico_nombre_snapshot')
    .order('created_at', { ascending: true })

  return <AdminMantenimientoDashboard tickets={all ?? []} />
}
