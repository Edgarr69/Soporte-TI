export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import { AdminMaintenanceDetail } from '@/components/mantenimiento/admin-maintenance-detail'

export default async function AdminMaintenanceTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select(`
      *,
      category:maintenance_categories(name),
      user:profiles!user_id(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  const [
    { data: statusHistory },
    { data: comments },
    { data: evidencias },
    { data: technicians },
  ] = await Promise.all([
    supabase
      .from('maintenance_status_history')
      .select('*, changer:profiles!changed_by(full_name, email)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('maintenance_comments')
      .select('*, author:profiles!author_id(full_name, email)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('maintenance_evidencias')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'tecnico_mantenimiento')
      .order('full_name'),
  ])

  return (
    <AdminMaintenanceDetail
      ticket={ticket as unknown as Parameters<typeof AdminMaintenanceDetail>[0]['ticket']}
      statusHistory={statusHistory ?? []}
      comments={comments ?? []}
      evidencias={evidencias ?? []}
      technicians={(technicians ?? []) as { id: string; full_name: string | null; email: string }[]}
      currentAdminId={user.id}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
    />
  )
}
