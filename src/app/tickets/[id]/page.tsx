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
    .select('*, author:profiles(full_name, email)')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at', { ascending: true })

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <TicketDetail ticket={ticket} history={history ?? []} comments={comments ?? []} />
    </main>
  )
}
