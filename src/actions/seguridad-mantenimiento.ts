'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { MaintenanceType } from '@/lib/types'
import { NIVEL_RIESGO_LABELS, type NivelRiesgo } from '@/lib/types'
import { createAdminNotification } from '@/actions/admin-notifications'

const SEG_ADMINS  = ['admin_seguridad', 'super_admin']
const MANT_ADMINS = ['admin_mantenimiento', 'super_admin']

async function getActor(roles: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || !roles.includes(profile.role)) return { error: 'Sin permiso' as const }
  return { supabase, user, name: profile.full_name ?? profile.email ?? 'Admin' }
}

function revalidateBoth(segId: string, mantId?: string) {
  revalidatePath(`/admin/seguridad/tickets/${segId}`)
  revalidatePath(`/seguridad/${segId}`)
  revalidatePath('/admin/seguridad/tickets')
  revalidatePath('/admin/mantenimiento/tickets')
  if (mantId) revalidatePath(`/admin/mantenimiento/tickets/${mantId}`)
  revalidatePath('/admin', 'layout')
  revalidateTag('admin-seguridad-tickets', {})
  revalidateTag('admin-mantenimiento-tickets', {})
}

// ─── Seguridad: solicitar apoyo ───────────────────────────

export async function requestMantenimientoSupport(
  ticketId: string,
  data: { type: MaintenanceType; servicio: string; note: string },
) {
  const actor = await getActor(SEG_ADMINS)
  if ('error' in actor) return { error: actor.error }
  const { supabase, user, name } = actor

  if (data.type !== 'general' && data.type !== 'maquinaria') return { error: 'Tipo no válido' }
  const servicio = data.servicio?.trim() ?? ''
  const note     = data.note?.trim() ?? ''
  if (servicio.length < 3)   return { error: 'Indica qué se necesita reparar (mínimo 3 caracteres)' }
  if (servicio.length > 200) return { error: 'El servicio no puede superar 200 caracteres' }
  if (note.length > 2000)    return { error: 'La nota no puede superar 2000 caracteres' }

  const { data: ticket } = await supabase
    .from('seguridad_tickets')
    .select('folio, status, mant_request_status, area_name_snapshot')
    .eq('id', ticketId).single()
  if (!ticket) return { error: 'Reporte no encontrado' }
  if (!['en_revision', 'en_proceso'].includes(ticket.status))
    return { error: 'Solo puedes solicitar apoyo en reportes en revisión o en atención' }
  if (ticket.mant_request_status === 'pendiente' || ticket.mant_request_status === 'aceptada')
    return { error: 'Este reporte ya tiene una solicitud de apoyo activa' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('seguridad_tickets').update({
    mant_request_status:   'pendiente',
    mant_request_type:     data.type,
    mant_request_servicio: servicio,
    mant_request_note:     note || null,
    mant_requested_at:     now,
    mant_requested_by:     user.id,
    mant_responded_at:     null,
    mant_responded_by:     null,
    mant_reject_reason:    null,
  }).eq('id', ticketId)
  if (error) return { error: error.message }

  await Promise.all([
    supabase.from('seguridad_status_history').insert({
      ticket_id: ticketId, changed_by: user.id,
      from_status: ticket.status, to_status: ticket.status,
      comment: `Se solicitó apoyo a Mantenimiento: ${servicio}`,
    }),
    createAdminNotification({
      title:       'Seguridad e Higiene solicita apoyo',
      message:     `${name} pide "${servicio}"${ticket.area_name_snapshot ? ` en ${ticket.area_name_snapshot}` : ''} (reporte ${ticket.folio})`,
      type:        'seguridad_mant_requested',
      module:      'mantenimiento',
      actorId:     user.id,
      actorName:   name,
      targetId:    ticketId,
      targetType:  'seguridad_mant_request',
      targetFolio: ticket.folio,
    }),
  ])

  revalidateBoth(ticketId)
  return { success: true }
}

export async function withdrawMantenimientoSupport(ticketId: string) {
  const actor = await getActor(SEG_ADMINS)
  if ('error' in actor) return { error: actor.error }
  const { supabase, user } = actor

  const { data: updated, error } = await supabase
    .from('seguridad_tickets')
    .update({
      mant_request_status: null, mant_request_type: null, mant_request_servicio: null,
      mant_request_note: null, mant_requested_at: null, mant_requested_by: null,
    })
    .eq('id', ticketId)
    .eq('mant_request_status', 'pendiente')
    .select('status')
  if (error) return { error: error.message }
  if (!updated?.length) return { error: 'La solicitud ya fue respondida por Mantenimiento' }

  await supabase.from('seguridad_status_history').insert({
    ticket_id: ticketId, changed_by: user.id,
    from_status: updated[0].status, to_status: updated[0].status,
    comment: 'Se retiró la solicitud de apoyo a Mantenimiento',
  })

  revalidateBoth(ticketId)
  return { success: true }
}

// ─── Mantenimiento: aceptar / rechazar ────────────────────

export async function respondMantenimientoSupport(
  seguridadTicketId: string,
  accept: boolean,
  reason?: string,
) {
  const actor = await getActor(MANT_ADMINS)
  if ('error' in actor) return { error: actor.error }
  const { supabase, user, name } = actor
  const db = createAdminClient()   // el admin de mantenimiento no tiene RLS sobre seguridad

  const rejectReason = reason?.trim() ?? ''
  if (!accept && rejectReason.length < 3) return { error: 'Indica el motivo del rechazo' }
  if (rejectReason.length > 2000) return { error: 'El motivo no puede superar 2000 caracteres' }

  // Reclamar la solicitud de forma atómica: solo una respuesta gana
  const now = new Date().toISOString()
  const { data: claimed, error: claimErr } = await db
    .from('seguridad_tickets')
    .update({
      mant_request_status: accept ? 'aceptada' : 'rechazada',
      mant_responded_at:   now,
      mant_responded_by:   user.id,
      mant_reject_reason:  accept ? null : rejectReason,
    })
    .eq('id', seguridadTicketId)
    .eq('mant_request_status', 'pendiente')
    .select('*')
  if (claimErr) return { error: claimErr.message }
  const seg = claimed?.[0]
  if (!seg) return { error: 'La solicitud ya no está pendiente' }

  if (!accept) {
    await Promise.all([
      db.from('seguridad_status_history').insert({
        ticket_id: seg.id, changed_by: user.id,
        from_status: seg.status, to_status: seg.status,
        comment: `Mantenimiento rechazó el apoyo: ${rejectReason}`,
      }),
      createAdminNotification({
        title:       'Mantenimiento rechazó la solicitud',
        message:     `${name} rechazó el apoyo para el reporte ${seg.folio}: ${rejectReason}`,
        type:        'seguridad_mant_rejected',
        module:      'seguridad',
        actorId:     user.id,
        actorName:   name,
        targetId:    seg.id,
        targetType:  'seguridad_ticket',
        targetFolio: seg.folio,
      }),
    ])
    revalidateBoth(seg.id)
    return { success: true }
  }

  // ── Aceptar: crear la solicitud de mantenimiento ligada ──
  const revert = () => db.from('seguridad_tickets').update({
    mant_request_status: 'pendiente', mant_responded_at: null, mant_responded_by: null,
  }).eq('id', seg.id)

  const type = (seg.mant_request_type ?? 'general') as MaintenanceType
  const { data: folioData, error: folioErr } = await supabase
    .rpc('generate_folio', { p_module: type })
  if (folioErr || !folioData) {
    await revert()
    return { error: `Error generando folio: ${folioErr?.message ?? 'sin datos'}` }
  }

  const { data: requester } = seg.mant_requested_by
    ? await db.from('profiles').select('full_name, email').eq('id', seg.mant_requested_by).single()
    : { data: null }
  const requesterName = requester?.full_name ?? requester?.email ?? 'Seguridad e Higiene'

  const riesgo = seg.nivel_riesgo as NivelRiesgo
  const descripcion = [
    seg.mant_request_note,
    `— Reporte de Seguridad e Higiene ${seg.folio} —`,
    `Categoría: ${seg.category_name_snapshot ?? '—'} · Riesgo: ${NIVEL_RIESGO_LABELS[riesgo] ?? riesgo}`,
    `Ubicación: ${seg.ubicacion}`,
    seg.descripcion,
  ].filter(Boolean).join('\n')

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
  const { data: mt, error: insErr } = await db
    .from('maintenance_tickets')
    .insert({
      folio:                    folioData as string,
      type,
      user_id:                  seg.mant_requested_by ?? user.id,
      department_id:            seg.department_id,
      department_name_snapshot: seg.department_name_snapshot,
      area_id:                  seg.area_id,
      area_name_snapshot:       seg.area_name_snapshot,
      encargado_nombre:         requesterName,
      category_id:              null,
      servicio:                 seg.mant_request_servicio ?? 'Apoyo a Seguridad e Higiene',
      descripcion:              descripcion.slice(0, 5000),
      fecha_solicitud:          today,
      status:                   'en_revision',
      prioridad:                type === 'maquinaria' || riesgo === 'alto' || riesgo === 'critico' ? 'alta' : 'normal',
      seguridad_ticket_id:      seg.id,
    })
    .select('id, folio')
    .single()
  if (insErr || !mt) {
    console.error('[respondMantenimientoSupport] insert failed:', insErr?.message)
    await revert()
    return { error: 'No se pudo crear la solicitud de mantenimiento' }
  }

  // Copiar las fotos del reporte como evidencia (para el PDF y el técnico)
  try {
    const { data: fotos } = await db
      .from('seguridad_evidencias')
      .select('file_name, file_path, file_size, mime_type')
      .eq('ticket_id', seg.id)
      .in('mime_type', ['image/jpeg', 'image/jpg', 'image/png'])
      .limit(3)
    for (const f of fotos ?? []) {
      const { data: blob } = await db.storage.from('seguridad-docs').download(f.file_path)
      if (!blob) continue
      const ext  = f.mime_type === 'image/png' ? 'png' : 'jpg'
      const dest = `maintenance/${mt.id}/evidencia-${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await db.storage.from('maintenance-docs')
        .upload(dest, Buffer.from(await blob.arrayBuffer()), { contentType: f.mime_type ?? 'image/jpeg' })
      if (upErr) continue
      await db.from('maintenance_evidencias').insert({
        ticket_id: mt.id, uploaded_by: user.id, file_name: f.file_name,
        file_path: dest, file_size: f.file_size, mime_type: f.mime_type, type: 'evidencia',
      })
    }
  } catch (e) {
    console.error('[respondMantenimientoSupport] copia de fotos falló:', e)
  }

  const updates: Record<string, unknown> = { maintenance_ticket_id: mt.id }
  if (seg.status === 'en_revision') { updates.status = 'en_proceso'; updates.started_at = now }
  await db.from('seguridad_tickets').update(updates).eq('id', seg.id)

  await Promise.all([
    db.from('maintenance_status_history').insert({
      ticket_id: mt.id, changed_by: user.id, from_status: null, to_status: 'en_revision',
      comment: `Creada desde Seguridad e Higiene (${seg.folio}); aceptada por ${name}`,
    }),
    db.from('seguridad_status_history').insert({
      ticket_id: seg.id, changed_by: user.id,
      from_status: seg.status, to_status: (updates.status as string) ?? seg.status,
      comment: `Mantenimiento aceptó el apoyo (solicitud ${mt.folio})`,
    }),
    db.from('notifications').insert({
      user_id: seg.user_id, ticket_id: null, type: 'status_changed', module: 'seguridad',
      title:   `Reporte ${seg.folio} turnado a Mantenimiento`,
      body:    `Mantenimiento se encargará de la reparación (solicitud ${mt.folio})`,
    }),
    createAdminNotification({
      title:       'Mantenimiento aceptó la solicitud',
      message:     `${name} aceptó el apoyo para el reporte ${seg.folio} (solicitud ${mt.folio})`,
      type:        'seguridad_mant_accepted',
      module:      'seguridad',
      actorId:     user.id,
      actorName:   name,
      targetId:    seg.id,
      targetType:  'seguridad_ticket',
      targetFolio: seg.folio,
    }),
  ])

  revalidateBoth(seg.id, mt.id)
  return { success: true, maintenanceTicketId: mt.id, folio: mt.folio }
}
