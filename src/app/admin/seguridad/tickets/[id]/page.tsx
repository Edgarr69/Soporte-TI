export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { AdminSeguridadDetail } from '@/components/seguridad/admin-seguridad-detail'
import { getAuthedProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSeguridadTicketChildren } from '@/lib/seguridad-data'

export default async function AdminSeguridadTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_seguridad', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  // Rol validado arriba: lecturas con service role para no depender de la
  // RLS de profiles en los joins (nombres de solicitante/autores)
  const admin = createAdminClient()
  const { data: ticket } = await admin
    .from('seguridad_tickets')
    .select('*, user:profiles!user_id(full_name, email)')
    .eq('id', id)
    .single()
  if (!ticket) notFound()

  const { statusHistory, comments, evidencias, isReopened } =
    await loadSeguridadTicketChildren(admin, id, { includeInternal: true })

  const rawUser = ticket.user as unknown
  const owner = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as { full_name: string | null; email: string } | null

  return (
    <AdminSeguridadDetail
      ticket={{ ...ticket, user: owner ?? null } as unknown as Parameters<typeof AdminSeguridadDetail>[0]['ticket']}
      statusHistory={statusHistory}
      comments={comments}
      evidencias={evidencias}
      currentUserId={user.id}
      currentUserName={profile.full_name ?? user.email ?? ''}
      isReopened={isReopened}
    />
  )
}
