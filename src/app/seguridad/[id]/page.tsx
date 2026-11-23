export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { SeguridadDetail } from '@/components/seguridad/seguridad-detail'
import { getAuthedProfile } from '@/lib/auth'
import { loadSeguridadTicketChildren } from '@/lib/seguridad-data'
import type { SeguridadStatus, NivelRiesgo } from '@/lib/types'

export default async function SeguridadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const { data: ticket } = await supabase
    .from('seguridad_tickets')
    .select('*')
    .eq('id', id)
    .single()

  // Solo el dueño accede aquí — admins usan /admin/seguridad/tickets/[id]
  if (!ticket) notFound()
  if (ticket.user_id !== user.id) {
    if (['admin_seguridad', 'super_admin'].includes(profile.role)) redirect(`/admin/seguridad/tickets/${id}`)
    notFound()
  }

  const { statusHistory, comments, evidencias, isReopened } =
    await loadSeguridadTicketChildren(supabase, id, { includeInternal: false })

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
      <SeguridadDetail
        ticket={{
          ...ticket,
          status:       ticket.status as SeguridadStatus,
          nivel_riesgo: ticket.nivel_riesgo as NivelRiesgo,
        }}
        statusHistory={statusHistory}
        comments={comments}
        evidencias={evidencias}
        currentUserId={user.id}
        currentUserName={profile?.full_name ?? user.email ?? ''}
        isReopened={isReopened}
      />
    </main>
  )
}
