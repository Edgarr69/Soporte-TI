export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TecnicoView } from '@/components/tecnico/tecnico-view'

export default async function TecnicoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'tecnico_mantenimiento') redirect('/dashboard')
  if (!profile.first_login_completed) redirect('/completar-perfil')

  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select(`
      id, folio, type, status, servicio, descripcion,
      department_name_snapshot, area_name_snapshot,
      fecha_solicitud, fecha_termino_estimada,
      created_at, updated_at
    `)
    .eq('tecnico_id', user.id)
    .not('status', 'in', '("terminado","cancelado")')
    .order('created_at', { ascending: false })

  const { data: histTickets } = await supabase
    .from('maintenance_tickets')
    .select('id, folio, type, status, servicio, department_name_snapshot, fecha_solicitud, updated_at')
    .eq('tecnico_id', user.id)
    .in('status', ['terminado', 'cancelado'])
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <TecnicoView
      active={tickets ?? []}
      history={histTickets ?? []}
      technicianName={profile.full_name ?? ''}
    />
  )
}
