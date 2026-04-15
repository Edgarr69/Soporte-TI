export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AdminTicketDetail } from '@/components/admin/admin-ticket-detail'

interface Props { params: Promise<{ id: string }> }

export default async function AdminTicketDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
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

  const { data: history } = await supabase
    .from('ticket_status_history')
    .select('*, changer:profiles(full_name, email)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const { data: comments } = await supabase
    .from('ticket_comments')
    .select('*, author:profiles(full_name, email)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  return (
    <AdminTicketDetail
      ticket={ticket as Record<string, unknown>}
      history={history ?? []}
      comments={comments ?? []}
    />
  )
}
