export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { AdminSeguridadDetail } from '@/components/seguridad/admin-seguridad-detail'
import { getAuthedProfile } from '@/lib/auth'
import { DeleteTicketButton } from '@/components/shared/delete-ticket-button'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSeguridadTicketChildren } from '@/lib/seguridad-data'
import type { MaintenanceStatus } from '@/lib/types'

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

  const [{ statusHistory, comments, evidencias, isReopened }, { data: mt }] = await Promise.all([
    loadSeguridadTicketChildren(admin, id, { includeInternal: true }),
    ticket.maintenance_ticket_id
      ? admin.from('maintenance_tickets')
          .select('folio, status, tecnico_nombre_snapshot')
          .eq('id', ticket.maintenance_ticket_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rawUser = ticket.user as unknown
  const owner = (Array.isArray(rawUser) ? rawUser[0] : rawUser) as { full_name: string | null; email: string } | null

  return (
    <div className="space-y-3">
      {profile?.role === 'super_admin' && (
        <div className="flex justify-end">
          <DeleteTicketButton module="seguridad" ticketId={ticket.id as string} folio={ticket.folio as string} redirectTo="/admin/seguridad/tickets" />
        </div>
      )}
      <AdminSeguridadDetail
        ticket={{ ...ticket, user: owner ?? null } as unknown as Parameters<typeof AdminSeguridadDetail>[0]['ticket']}
        statusHistory={statusHistory}
        comments={comments}
        evidencias={evidencias}
        currentUserId={user.id}
        currentUserName={profile.full_name ?? user.email ?? ''}
        isReopened={isReopened}
        mantSupport={{
          status:                  ticket.mant_request_status ?? null,
          type:                    ticket.mant_request_type ?? null,
          servicio:                ticket.mant_request_servicio ?? null,
          note:                    ticket.mant_request_note ?? null,
          requestedAt:             ticket.mant_requested_at ?? null,
          respondedAt:             ticket.mant_responded_at ?? null,
          rejectReason:            ticket.mant_reject_reason ?? null,
          resolvedByMantenimiento: !!ticket.resolved_by_mantenimiento,
          maintenanceTicket: mt ? {
            folio:   mt.folio as string,
            status:  mt.status as MaintenanceStatus,
            tecnico: (mt.tecnico_nombre_snapshot as string | null) ?? null,
          } : null,
        }}
      />
    </div>
  )
}
