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

  const [{ data: statusHistory }, { data: comments }] =
    await Promise.all([
      supabase
        .from('maintenance_status_history')
        .select('*, changer:profiles!changed_by(full_name, email)')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('maintenance_comments')
        .select('*, author_id, author:profiles(full_name, email)')
        .eq('ticket_id', id)
        .eq('is_internal', false)
        .order('created_at', { ascending: true }),
    ])

  const history = statusHistory ?? []
  const lastEntry = history[history.length - 1]
  const isReopened = ticket.status === 'pendiente' &&
    (lastEntry?.from_status === 'terminado' || lastEntry?.from_status === 'cancelado')

  // Supabase devuelve joins como array — normalizar a objeto
  type RawComment = { id: string; body: string; created_at: string; author_id: string | null; author: { full_name: string; email: string } | { full_name: string; email: string }[] | null }
  const normalizedComments = (comments ?? []).map((c: RawComment) => ({
    id:         c.id,
    body:       c.body,
    created_at: c.created_at,
    author_id:  c.author_id,
    author:     Array.isArray(c.author) ? (c.author[0] ?? null) : c.author,
  }))

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <MaintenanceDetail
        ticket={ticket}
        statusHistory={history}
        comments={normalizedComments}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? user.email ?? ''}
        isReopened={isReopened}
      />
    </main>
  )
}
