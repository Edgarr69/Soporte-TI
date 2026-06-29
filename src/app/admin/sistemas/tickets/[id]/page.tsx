export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { AdminTicketDetail } from '@/components/admin/admin-ticket-detail'
import { getAuthedProfile } from '@/lib/auth'

interface Props { params: Promise<{ id: string }> }

export default async function AdminTicketDetailPage({ params }: Props) {
  const { id } = await params
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_categories(name, icon),
      ticket_subcategories(name),
      user:profiles(id, full_name, email),
      department:departments(name)
    `)
    .eq('id', id)
    .single()

  if (!ticket) notFound()

  const [{ data: history }, { data: comments }] = await Promise.all([
    supabase
      .from('ticket_status_history')
      .select('*, changer:profiles(full_name, email)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('ticket_comments')
      .select('*, author:profiles(full_name, email)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ])

  const normalizedTicket = {
    ...ticket,
    ticket_categories:    Array.isArray(ticket.ticket_categories)    ? (ticket.ticket_categories[0]    ?? null) : ticket.ticket_categories,
    ticket_subcategories: Array.isArray(ticket.ticket_subcategories) ? (ticket.ticket_subcategories[0] ?? null) : ticket.ticket_subcategories,
    user:                 Array.isArray(ticket.user)                 ? (ticket.user[0]                 ?? null) : ticket.user,
    department:           Array.isArray(ticket.department)           ? (ticket.department[0]           ?? null) : ticket.department,
  }

  return (
    <AdminTicketDetail
      ticket={normalizedTicket as Record<string, unknown>}
      history={history ?? []}
      comments={comments ?? []}
      userId={user.id}
      adminName={profile?.full_name ?? user.email ?? 'Admin'}
    />
  )
}
