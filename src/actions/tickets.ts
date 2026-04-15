'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calculatePriority } from '@/lib/priority'
import type { NewTicketFormData, AdminUpdateTicketData, TicketStatus } from '@/lib/types'
import { createAdminNotification } from '@/actions/admin-notifications'

// ─── Crear ticket ─────────────────────────────────────────

export async function createTicket(data: NewTicketFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id')
    .eq('id', user.id)
    .single()

  // obtener base_score de la subcategoría
  const { data: subcat } = await supabase
    .from('ticket_subcategories')
    .select('base_score')
    .eq('id', data.subcategory_id)
    .single()

  const { priority, score } = calculatePriority({
    blockingLevel:  data.blocking_level,
    affectedScope:  data.affected_scope,
    hasWorkaround:  data.has_workaround,
    baseScore:      subcat?.base_score ?? 1,
  })

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      user_id:          user.id,
      department_id:    profile?.department_id ?? null,
      category_id:      data.category_id,
      subcategory_id:   data.subcategory_id,
      description:      data.description,
      blocking_level:   data.blocking_level,
      affected_scope:   data.affected_scope,
      has_workaround:   data.has_workaround,
      priority,
      priority_score:   score,
      status:           'abierto',
    })
    .select('id, folio')
    .single()

  if (error) return { error: error.message }

  // Notificación al usuario
  const { data: creatorProfile } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const creatorName = creatorProfile?.full_name ?? creatorProfile?.email ?? 'Tú'
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id:   user.id,
    ticket_id: null,
    type:      'ticket_created',
    title:     'Ticket de sistemas creado',
    body:      `${creatorName} ha creado un ticket de sistemas con prioridad ${priority}`,
  })
  if (notifErr) console.error('[createTicket] notification insert failed:', notifErr.message)

  // Historial inicial
  await supabase.from('ticket_status_history').insert({
    ticket_id:    ticket.id,
    changed_by:   user.id,
    from_status:  null,
    to_status:    'abierto',
    comment:      'Ticket creado',
  })

  // Admin notification
  const { data: actorProfile } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const actorName = actorProfile?.full_name ?? actorProfile?.email ?? 'Usuario'
  await createAdminNotification({
    title:       'Nuevo ticket de sistemas',
    message:     `${actorName} ha creado el ticket ${ticket.folio}`,
    type:        'ticket_created',
    module:      'sistemas',
    actorId:     user.id,
    actorName:   actorName,
    targetId:    ticket.id,
    targetType:  'ticket',
    targetFolio: ticket.folio,
  })

  revalidatePath('/tickets')
  revalidatePath('/dashboard')
  revalidatePath('/mis-tickets')
  revalidatePath('/notificaciones')
  return { ticket }
}

// ─── Cambiar estado (admin) ───────────────────────────────

export async function changeTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  comment?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const allowedRoles = ['admin_sistemas', 'super_admin']
  if (!adminProfile || !allowedRoles.includes(adminProfile.role)) return { error: 'Sin permiso' }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('status, user_id, folio, first_response_at, created_at')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'Ticket no encontrado' }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status: newStatus }

  // Primera respuesta
  if (!ticket.first_response_at && newStatus === 'en_proceso') {
    updates.first_response_at = now
    const diffMin = Math.round(
      (Date.now() - new Date(ticket.created_at).getTime()) / 60000
    )
    updates.first_response_time_minutes = diffMin
  }

  if (newStatus === 'resuelto' || newStatus === 'cerrado') {
    updates.resolved_at = now
    const diffMin = Math.round(
      (Date.now() - new Date(ticket.created_at).getTime()) / 60000
    )
    updates.resolution_time_minutes = diffMin
  }

  if (newStatus === 'cerrado') {
    updates.closed_at = now
  }

  if (newStatus === 'reabierto') {
    updates.is_reopened = true
    updates.reopened_at = now
    updates.resolved_at = null
    updates.closed_at   = null
  }

  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)

  if (error) return { error: error.message }

  // Historial
  await supabase.from('ticket_status_history').insert({
    ticket_id:    ticketId,
    changed_by:   user.id,
    from_status:  ticket.status,
    to_status:    newStatus,
    comment:      comment ?? null,
  })

  // Notificación al usuario dueño del ticket
  const { data: adminProfileNotif } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const adminNameNotif = adminProfileNotif?.full_name ?? adminProfileNotif?.email ?? 'El administrador'
  const statusVerbsNotif: Record<string, string> = {
    cerrado:    'cerró tu ticket',
    reabierto:  'reabrió tu ticket',
    resuelto:   'marcó tu ticket como resuelto',
    en_proceso: 'puso tu ticket en proceso',
    en_espera:  'puso tu ticket en espera',
  }
  const statusVerbNotif = statusVerbsNotif[newStatus] ?? `cambió tu ticket a ${newStatus}`
  await supabase.from('notifications').insert({
    user_id:   ticket.user_id,
    ticket_id: ticketId,
    type:      newStatus === 'reabierto' ? 'ticket_reopened' : 'status_changed',
    title:     'Estado de ticket actualizado',
    body:      `${adminNameNotif} ${statusVerbNotif}${comment ? `: ${comment}` : ''}`,
  })

  // Admin notification
  const { data: adminProfile2 } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const adminName2 = adminProfile2?.full_name ?? adminProfile2?.email ?? 'Admin'
  const adminNotifType = newStatus === 'cerrado' ? 'ticket_closed'
    : newStatus === 'reabierto' ? 'ticket_reopened'
    : 'ticket_status_changed'
  const statusTitles: Record<string, string> = {
    cerrado:    'Ticket cerrado',
    reabierto:  'Ticket reabierto',
    resuelto:   'Ticket resuelto',
    en_proceso: 'Ticket en proceso',
    en_espera:  'Ticket en espera',
  }
  const statusVerbs: Record<string, string> = {
    cerrado:    'cerró',
    reabierto:  'reabrió',
    resuelto:   'marcó como resuelto',
    en_proceso: 'puso en proceso',
    en_espera:  'puso en espera',
  }
  const statusTitle = statusTitles[newStatus] ?? 'Ticket actualizado'
  const statusVerb  = statusVerbs[newStatus]  ?? `cambió el estado a ${newStatus} en`
  await createAdminNotification({
    title:       statusTitle,
    message:     `${adminName2} ${statusVerb} el ticket ${ticket.folio}${comment ? `: ${comment}` : ''}`,
    type:        adminNotifType,
    module:      'sistemas',
    actorId:     user.id,
    actorName:   adminName2,
    targetId:    ticketId,
    targetType:  'ticket',
    targetFolio: ticket.folio,
  })

  revalidatePath('/admin/sistemas/tickets')
  revalidatePath(`/admin/sistemas/tickets/${ticketId}`)
  revalidatePath('/tickets')
  return { success: true }
}

// ─── Actualizar solución y notas (admin) ──────────────────

export async function updateTicketResolution(
  ticketId: string,
  data: AdminUpdateTicketData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const allowedRoles = ['admin_sistemas', 'super_admin']
  if (!adminProfile || !allowedRoles.includes(adminProfile.role)) return { error: 'Sin permiso' }

  const updates: Record<string, unknown> = {}
  if (data.resolution_summary !== undefined)
    updates.resolution_summary = data.resolution_summary
  if (data.visible_resolution_summary !== undefined)
    updates.visible_resolution_summary = data.visible_resolution_summary
  if (data.technical_notes !== undefined)
    updates.technical_notes = data.technical_notes

  const { error } = await supabase
    .from('tickets')
    .update(updates)
    .eq('id', ticketId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/sistemas/tickets/${ticketId}`)
  return { success: true }
}

// ─── Agregar comentario ───────────────────────────────────

export async function addComment(
  ticketId: string,
  body: string,
  isInternal: boolean = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: ticket } = await supabase
    .from('tickets')
    .select('user_id, folio')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'Ticket no encontrado' }

  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id:   ticketId,
    author_id:   user.id,
    body,
    is_internal: isInternal,
  })

  if (error) return { error: error.message }

  // Notificar al dueño del ticket si el comentario es del admin y no interno
  if (!isInternal && ticket.user_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id:   ticket.user_id,
      ticket_id: ticketId,
      type:      'comment_added',
      title:     `Nuevo comentario en ${ticket.folio}`,
      body:      body.slice(0, 120),
    })
  }

  revalidatePath(`/admin/sistemas/tickets/${ticketId}`)
  revalidatePath(`/tickets/${ticketId}`)
  return { success: true }
}
