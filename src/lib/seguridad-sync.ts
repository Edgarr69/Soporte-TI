import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createAdminNotification } from '@/actions/admin-notifications'
import type { MaintenanceStatus } from '@/lib/types'

/**
 * Propaga a Seguridad e Higiene los cambios de estado de una solicitud de
 * mantenimiento que nació de un reporte de seguridad (`seguridad_ticket_id`).
 *
 * - terminado → el reporte de seguridad se cierra como "Atendido" y queda
 *   marcado `resolved_by_mantenimiento`
 * - cancelado → la solicitud de apoyo pasa a `cancelada`; Seguridad recupera
 *   el control del reporte
 * - pendiente (reapertura) → el apoyo vuelve a `aceptada` y, si el reporte ya
 *   estaba cerrado por Mantenimiento, regresa a "En atención"
 *
 * Usa service role: el admin de mantenimiento no tiene RLS sobre las tablas
 * de seguridad. NO es Server Action (vive fuera de 'use server').
 */
export async function syncSeguridadFromMaintenance(params: {
  seguridadTicketId: string
  maintenanceFolio: string
  newStatus: MaintenanceStatus
  actorId: string
  actorName: string
  cancelReason?: string | null
}) {
  const { seguridadTicketId, maintenanceFolio, newStatus, actorId, actorName } = params
  if (!['terminado', 'cancelado', 'pendiente'].includes(newStatus)) return

  const db = createAdminClient()
  const { data: seg } = await db
    .from('seguridad_tickets')
    .select('id, folio, status, user_id, created_at, acciones_correctivas, mant_request_status, mant_requested_by, resolved_by_mantenimiento')
    .eq('id', seguridadTicketId)
    .single()
  if (!seg) return

  const now = new Date().toISOString()
  let historyComment = ''
  let toStatus = seg.status as string
  const updates: Record<string, unknown> = {}

  if (newStatus === 'terminado') {
    if (seg.status === 'terminado' || seg.status === 'cancelado') return
    toStatus = 'terminado'
    const nota = `Atendido por Mantenimiento (solicitud ${maintenanceFolio}).`
    Object.assign(updates, {
      status:                    'terminado',
      finished_at:               now,
      resolution_time_minutes:   Math.round((Date.now() - new Date(seg.created_at).getTime()) / 60000),
      resolved_by_mantenimiento: true,
      acciones_correctivas:      seg.acciones_correctivas?.trim()
                                   ? `${seg.acciones_correctivas.trim()}\n\n${nota}`
                                   : nota,
    })
    historyComment = `Terminado por Mantenimiento (${maintenanceFolio})`
  } else if (newStatus === 'cancelado') {
    if (seg.mant_request_status !== 'aceptada') return
    Object.assign(updates, {
      mant_request_status: 'cancelada',
      mant_reject_reason:  params.cancelReason?.trim() || null,
    })
    historyComment = `Mantenimiento canceló la solicitud ${maintenanceFolio}` +
      (params.cancelReason?.trim() ? `: ${params.cancelReason.trim()}` : '')
  } else {
    // Reapertura de la solicitud de mantenimiento
    updates.mant_request_status = 'aceptada'
    updates.mant_reject_reason  = null
    if (seg.status === 'terminado' && seg.resolved_by_mantenimiento) {
      toStatus = 'en_proceso'
      Object.assign(updates, {
        status:                    'en_proceso',
        finished_at:               null,
        resolution_time_minutes:   null,
        resolved_by_mantenimiento: false,
      })
    }
    historyComment = `Mantenimiento reabrió la solicitud ${maintenanceFolio}`
  }

  const { error } = await db.from('seguridad_tickets').update(updates).eq('id', seg.id)
  if (error) {
    console.error('[syncSeguridadFromMaintenance] update failed:', error.message)
    return
  }

  await Promise.all([
    db.from('seguridad_status_history').insert({
      ticket_id:   seg.id,
      changed_by:  actorId,
      from_status: seg.status,
      to_status:   toStatus,
      comment:     historyComment,
    }),
    newStatus === 'terminado'
      ? db.from('notifications').insert({
          user_id:   seg.user_id,
          ticket_id: null,
          type:      'status_changed',
          module:    'seguridad',
          title:     `Reporte ${seg.folio} atendido`,
          body:      `Mantenimiento terminó los trabajos de tu reporte ${seg.folio}`,
        })
      : Promise.resolve(),
    createAdminNotification({
      title:       newStatus === 'terminado' ? 'Mantenimiento terminó un reporte'
                 : newStatus === 'cancelado' ? 'Mantenimiento canceló el apoyo'
                 : 'Mantenimiento reabrió el apoyo',
      message:     `${actorName}: ${historyComment} — reporte ${seg.folio}`,
      type:        newStatus === 'terminado' ? 'seguridad_closed' : 'seguridad_status_changed',
      module:      'seguridad',
      actorId,
      actorName,
      targetId:    seg.id,
      targetType:  'seguridad_ticket',
      targetFolio: seg.folio,
    }),
  ])

  revalidatePath(`/admin/seguridad/tickets/${seg.id}`)
  revalidatePath(`/seguridad/${seg.id}`)
  revalidatePath('/admin/seguridad/tickets')
  revalidateTag('admin-seguridad-tickets', {})
}
