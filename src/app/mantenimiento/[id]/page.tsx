export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MaintenanceDetail } from '@/components/mantenimiento/maintenance-detail'

export default async function MantenimientoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('*, category:maintenance_categories(name)')
    .eq('id', id)
    .single()

  // Users can only see their own tickets (admins use the admin routes)
  if (!ticket || (ticket.user_id !== user.id && profile.role === 'usuario')) notFound()

  const [{ data: statusHistory }, { data: comments }, { data: evidencias }] =
    await Promise.all([
      supabase
        .from('maintenance_status_history')
        .select('*, changer:profiles!changed_by(full_name, email)')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('maintenance_comments')
        .select('*, author:profiles!author_id(full_name, email)')
        .eq('ticket_id', id)
        .eq('is_internal', false)
        .order('created_at', { ascending: true }),
      supabase
        .from('maintenance_evidencias')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),
    ])

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <MaintenanceDetail
        ticket={ticket}
        statusHistory={statusHistory ?? []}
        comments={comments ?? []}
        evidencias={evidencias ?? []}
        currentUserId={user.id}
        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      />
    </main>
  )
}
