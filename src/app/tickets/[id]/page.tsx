export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { TicketDetail } from '@/components/tickets/ticket-detail'

interface Props { params: Promise<{ id: string }> }

export default async function TicketDetailPage({ params }: Props) {
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
    .from('tickets')
    .select(`
      *,
      ticket_categories(name, icon),
      ticket_subcategories(name)
    `)
    .eq('id', id)
    .eq('user_id', user.id)   // RLS extra en cliente
    .single()

  if (!ticket) notFound()

  const { data: history } = await supabase
    .from('ticket_status_history')
    .select('*, changer:profiles(full_name, email)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('*, author_id, author:profiles(full_name, email)')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

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
      <TicketDetail
        ticket={ticket}
        history={history ?? []}
        comments={normalizedComments}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? user.email ?? ''}
      />
    </main>
  )
}
