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
    .from('profiles').select('role, full_name').eq('id', user.id).single()
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
      .select('*, author_id, author:profiles(full_name, email)')
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

  const history = statusHistory ?? []
  const lastEntry = history[history.length - 1]
  const isReopened = ticket.status === 'pendiente' &&
    (lastEntry?.from_status === 'terminado' || lastEntry?.from_status === 'cancelado')

  type RawComment = { id: string; body: string; created_at: string; is_internal: boolean; author_id: string | null; author: { full_name: string; email: string } | { full_name: string; email: string }[] | null }
  const normalizedComments = (comments ?? []).map((c: RawComment) => ({
    id:          c.id,
    body:        c.body,
    created_at:  c.created_at,
    is_internal: c.is_internal,
    author_id:   c.author_id,
    author:      Array.isArray(c.author) ? (c.author[0] ?? null) : c.author,
  }))

  return (
    <AdminMaintenanceDetail
      ticket={ticket as unknown as Parameters<typeof AdminMaintenanceDetail>[0]['ticket']}
      statusHistory={history}
      comments={normalizedComments as unknown as Parameters<typeof AdminMaintenanceDetail>[0]['comments']}
      evidencias={evidencias ?? []}
      technicians={(technicians ?? []) as { id: string; full_name: string | null; email: string }[]}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
      currentUserId={user.id}
      currentUserName={profile?.full_name ?? user.email ?? ''}
      isReopened={isReopened}
    />
  )
}
