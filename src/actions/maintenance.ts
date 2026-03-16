'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { MaintenanceStatus, NewMaintenanceTicketFormData } from '@/lib/types'
import { createAdminNotification } from '@/actions/admin-notifications'
import { renderToBuffer } from '@react-pdf/renderer'
import { MaintenancePdfDocument } from '@/components/mantenimiento/maintenance-pdf-template'
import React from 'react'
import path from 'path'

const LOGO_PATH = path.join(process.cwd(), 'fotos', 'logoo.png')

// ─── Crear solicitud de mantenimiento ────────────────────

export async function createMaintenanceTicket(data: NewMaintenanceTicketFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Generar folio atómico
  const module = data.type === 'general' ? 'general' : 'maquinaria'
  const { data: folioData, error: folioErr } = await supabase
    .rpc('generate_folio', { p_module: module })
  if (folioErr || !folioData) return { error: 'Error generando folio' }
  const folio = folioData as string

  // Insertar ticket (sin pdf_path aún)
  const { data: ticket, error: insertErr } = await supabase
    .from('maintenance_tickets')
    .insert({
      folio,
      type:                     data.type,
      user_id:                  user.id,
      department_id:            data.department_id,
      department_name_snapshot: data.department_name_snapshot,
      area_id:                  data.area_id,
      area_name_snapshot:       data.area_name_snapshot,
      encargado_nombre:         data.encargado_nombre,
      category_id:              data.category_id || null,
      servicio:                 data.servicio,
      descripcion:              data.descripcion,
      fecha_solicitud:          data.fecha_solicitud,
      fecha_termino_estimada:   data.fecha_termino_estimada || null,
      status:                   'pendiente',
    })
    .select('id, folio, created_at')
    .single()

  if (insertErr || !ticket) return { error: insertErr?.message ?? 'Error al crear solicitud' }

  // Generar PDF
  try {
    const pdfElement = React.createElement(MaintenancePdfDocument, {
      data: {
        folio:                  ticket.folio,
        type:                   data.type,
        fecha_solicitud:        data.fecha_solicitud,
        fecha_termino_estimada: data.fecha_termino_estimada || null,
        departamento:           data.department_name_snapshot,
        encargado:              data.encargado_nombre,
        area:                   data.area_name_snapshot,
        servicio:               data.servicio,
        descripcion:            data.descripcion,
        tecnico_nombre:         null,
        created_at:             ticket.created_at,
        logoPath:               LOGO_PATH,
      },
    }) as unknown as Parameters<typeof renderToBuffer>[0]
    const pdfBuffer = await renderToBuffer(pdfElement)

    const pdfPath = `maintenance/${ticket.id}/solicitud-${ticket.folio}.pdf`

    const { error: storageErr } = await supabase.storage
      .from('maintenance-docs')
      .upload(pdfPath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (!storageErr) {
      // Guardar path del PDF en el ticket
      await supabase
        .from('maintenance_tickets')
        .update({ pdf_path: pdfPath })
        .eq('id', ticket.id)

      // Registrar en evidencias como pdf_sistema
      await supabase.from('maintenance_evidencias').insert({
        ticket_id:   ticket.id,
        uploaded_by: user.id,
        file_name:   `solicitud-${ticket.folio}.pdf`,
        file_path:   pdfPath,
        mime_type:   'application/pdf',
        type:        'pdf_sistema',
      })
    }
  } catch {
    // PDF falla silenciosamente — ticket queda sin pdf_path
  }

  // Historial inicial
  await supabase.from('maintenance_status_history').insert({
    ticket_id:   ticket.id,
    changed_by:  user.id,
    from_status: null,
    to_status:   'pendiente',
    comment:     'Solicitud creada',
  })

  // Notificación al usuario
  const { data: creatorProfileM } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const creatorNameM = creatorProfileM?.full_name ?? creatorProfileM?.email ?? 'Tú'
  const { error: notifErr } = await supabase.from('notifications').insert({
    user_id:   user.id,
    ticket_id: null,
    type:      'ticket_created',
    title:     'Solicitud de mantenimiento creada',
    body:      `${creatorNameM} ha creado una solicitud de mantenimiento pendiente de revisión`,
  })
  if (notifErr) console.error('[createMaintenanceTicket] notification insert failed:', notifErr.message)

  // Admin notification
  const { data: actorProfileM } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const actorNameM = actorProfileM?.full_name ?? actorProfileM?.email ?? 'Usuario'
  await createAdminNotification({
    title:       'Nueva solicitud de mantenimiento',
    message:     `${actorNameM} solicitó "${data.servicio}" (${ticket.folio})`,
    type:        'maintenance_created',
    module:      'mantenimiento',
    actorId:     user.id,
    actorName:   actorNameM,
    targetId:    ticket.id,
    targetType:  'maintenance_ticket',
    targetFolio: ticket.folio,
  })

  revalidatePath('/mis-tickets')
  revalidatePath('/dashboard')
  revalidatePath('/notificaciones')
  return { ticket }
}

// ─── Cambiar estado (admin) ───────────────────────────────

export async function changeMaintenanceStatus(
  ticketId: string,
  newStatus: MaintenanceStatus,
  options?: {
    comment?: string
    tecnico_id?: string
    tecnico_nombre_snapshot?: string
    cancel_reason?: string
    fecha_termino_estimada?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const allowed = ['admin_mantenimiento', 'super_admin']
  if (!adminProfile || !allowed.includes(adminProfile.role))
    return { error: 'Sin permiso' }

  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('status, user_id, folio, created_at, type, department_name_snapshot, area_name_snapshot, encargado_nombre, servicio, descripcion, fecha_solicitud, fecha_termino_estimada')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'Solicitud no encontrada' }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'en_revision') {
    /* nothing extra */
  }
  if (newStatus === 'asignado') {
    updates.approved_by   = user.id
    updates.approved_at   = now
    updates.assigned_at   = now
    if (options?.tecnico_id) {
      updates.tecnico_id              = options.tecnico_id
      updates.tecnico_nombre_snapshot = options.tecnico_nombre_snapshot ?? null
    }
    if (options?.fecha_termino_estimada)
      updates.fecha_termino_estimada = options.fecha_termino_estimada
    const diffMin = Math.round(
      (Date.now() - new Date(ticket.created_at).getTime()) / 60000
    )
    updates.assignment_time_minutes = diffMin
  }
  if (newStatus === 'asignado') {
    // Regenerar PDF con técnico asignado
    try {
      const pdfElement = React.createElement(MaintenancePdfDocument, {
        data: {
          folio:                  ticket.folio,
          type:                   ticket.type as import('@/lib/types').MaintenanceType,
          fecha_solicitud:        ticket.fecha_solicitud,
          fecha_termino_estimada: options?.fecha_termino_estimada ?? ticket.fecha_termino_estimada ?? null,
          departamento:           ticket.department_name_snapshot ?? '',
          encargado:              ticket.encargado_nombre ?? '',
          area:                   ticket.area_name_snapshot ?? '',
          servicio:               ticket.servicio ?? '',
          descripcion:            ticket.descripcion ?? '',
          tecnico_nombre:         options?.tecnico_nombre_snapshot ?? null,
          created_at:             ticket.created_at,
          logoPath:               LOGO_PATH,
        },
      }) as unknown as Parameters<typeof renderToBuffer>[0]
      const pdfBuffer = await renderToBuffer(pdfElement)
      const pdfPath = `maintenance/${ticketId}/solicitud-${ticket.folio}.pdf`

      const { error: storageErr } = await supabase.storage
        .from('maintenance-docs')
        .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

      if (!storageErr) {
        await supabase.from('maintenance_tickets').update({ pdf_path: pdfPath }).eq('id', ticketId)

        // Upsert en evidencias: reemplaza el pdf_sistema existente si lo hay
        const { data: existing } = await supabase
          .from('maintenance_evidencias')
          .select('id')
          .eq('ticket_id', ticketId)
          .eq('type', 'pdf_sistema')
          .single()

        if (existing) {
          await supabase.from('maintenance_evidencias')
            .update({ file_path: pdfPath, file_name: `solicitud-${ticket.folio}.pdf`, updated_at: now })
            .eq('id', existing.id)
        } else {
          await supabase.from('maintenance_evidencias').insert({
            ticket_id:   ticketId,
            uploaded_by: user.id,
            file_name:   `solicitud-${ticket.folio}.pdf`,
            file_path:   pdfPath,
            mime_type:   'application/pdf',
            type:        'pdf_sistema',
          })
        }
      }
    } catch (e) {
      console.error('[changeMaintenanceStatus] PDF regeneration failed:', e)
    }
  }

  if (newStatus === 'en_proceso') {
    updates.started_at = now
  }
  if (newStatus === 'terminado') {
    updates.finished_at = now
    const diffMin = Math.round(
      (Date.now() - new Date(ticket.created_at).getTime()) / 60000
    )
    updates.resolution_time_minutes = diffMin
  }
  if (newStatus === 'cancelado') {
    updates.cancelled_at  = now
    updates.cancel_reason = options?.cancel_reason ?? null
  }

  const { error } = await supabase
    .from('maintenance_tickets')
    .update(updates)
    .eq('id', ticketId)

  if (error) return { error: error.message }

  // Historial
  await supabase.from('maintenance_status_history').insert({
    ticket_id:   ticketId,
    changed_by:  user.id,
    from_status: ticket.status,
    to_status:   newStatus,
    comment:     options?.comment ?? null,
  })

  // Notificación al usuario
  const statusLabels: Record<MaintenanceStatus, string> = {
    pendiente:   'Pendiente',
    en_revision: 'En revisión',
    asignado:    'Asignado',
    en_proceso:  'En proceso',
    terminado:   'Terminado',
    cancelado:   'Cancelado',
  }
  const { data: adminNotifM } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const adminNotifNameM = adminNotifM?.full_name ?? adminNotifM?.email ?? 'El administrador'
  const maintVerbsNotif: Record<MaintenanceStatus, string> = {
    pendiente:   'actualizó tu solicitud a pendiente',
    en_revision: 'puso tu solicitud en revisión',
    asignado:    'asignó tu solicitud a un técnico',
    en_proceso:  'puso tu solicitud en proceso',
    terminado:   'marcó tu solicitud como terminada',
    cancelado:   'canceló tu solicitud',
  }
  await supabase.from('notifications').insert({
    user_id:   ticket.user_id,
    ticket_id: null,
    type:      'status_changed',
    title:     'Estado de solicitud actualizado',
    body:      `${adminNotifNameM} ${maintVerbsNotif[newStatus]}${options?.comment ? `: ${options.comment}` : ''}`,
  })

  // Admin notification
  const { data: adminProfileM } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const adminNameM = adminProfileM?.full_name ?? adminProfileM?.email ?? 'Admin'
  const maintAdminType = newStatus === 'terminado' ? 'maintenance_closed'
    : newStatus === 'cancelado' ? 'maintenance_cancelled'
    : newStatus === 'asignado' ? 'maintenance_assigned'
    : 'maintenance_status_changed'
  const maintTitles: Record<string, string> = {
    terminado:   'Solicitud terminada',
    cancelado:   'Solicitud cancelada',
    asignado:    'Solicitud asignada',
    en_proceso:  'Solicitud en proceso',
    en_revision: 'Solicitud en revisión',
  }
  const maintVerbs: Record<string, string> = {
    terminado:   'marcó como terminada',
    cancelado:   'canceló',
    asignado:    'asignó',
    en_proceso:  'puso en proceso',
    en_revision: 'puso en revisión',
  }
  const maintTitle = maintTitles[newStatus] ?? 'Solicitud actualizada'
  const maintVerb  = maintVerbs[newStatus]  ?? `cambió el estado a ${newStatus} de`
  const tecnicoMsg = newStatus === 'asignado' && options?.tecnico_nombre_snapshot
    ? ` a ${options.tecnico_nombre_snapshot}`
    : ''
  await createAdminNotification({
    title:       maintTitle,
    message:     `${adminNameM} ${maintVerb} la solicitud ${ticket.folio}${tecnicoMsg}${options?.comment ? `: ${options.comment}` : ''}`,
    type:        maintAdminType,
    module:      'mantenimiento',
    actorId:     user.id,
    actorName:   adminNameM,
    targetId:    ticketId,
    targetType:  'maintenance_ticket',
    targetFolio: ticket.folio,
  })

  revalidatePath('/admin/mantenimiento/tickets')
  revalidatePath(`/admin/mantenimiento/tickets/${ticketId}`)
  revalidatePath('/mis-tickets')
  return { success: true }
}

// ─── Agregar comentario ───────────────────────────────────

export async function addMaintenanceComment(
  ticketId: string,
  body: string,
  isInternal = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('user_id, folio')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'No encontrado' }

  const { error } = await supabase.from('maintenance_comments').insert({
    ticket_id:   ticketId,
    author_id:   user.id,
    body,
    is_internal: isInternal,
  })
  if (error) return { error: error.message }

  if (!isInternal && ticket.user_id !== user.id) {
    await supabase.from('notifications').insert({
      user_id:   ticket.user_id,
      ticket_id: null,
      type:      'comment_added',
      title:     `Nuevo comentario en ${ticket.folio}`,
      body:      body.slice(0, 120),
    })
  }

  revalidatePath(`/mantenimiento/${ticketId}`)
  revalidatePath(`/admin/mantenimiento/tickets/${ticketId}`)
  return { success: true }
}

// ─── Cancelar solicitud (usuario, solo si pendiente) ──────

export async function cancelMaintenanceTicket(ticketId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: ticket } = await supabase
    .from('maintenance_tickets')
    .select('user_id, status, folio')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'No encontrado' }
  if (ticket.user_id !== user.id) return { error: 'Sin permiso' }
  if (ticket.status !== 'pendiente') return { error: 'Solo puedes cancelar solicitudes pendientes' }

  const now = new Date().toISOString()
  await supabase
    .from('maintenance_tickets')
    .update({ status: 'cancelado', cancelled_at: now, cancel_reason: reason ?? null })
    .eq('id', ticketId)

  await supabase.from('maintenance_status_history').insert({
    ticket_id:   ticketId,
    changed_by:  user.id,
    from_status: 'pendiente',
    to_status:   'cancelado',
    comment:     reason ?? 'Cancelado por el usuario',
  })

  revalidatePath('/mis-tickets')
  revalidatePath(`/mantenimiento/${ticketId}`)
  return { success: true }
}

// ─── Subir evidencia ──────────────────────────────────────

export async function uploadEvidencia(
  ticketId: string,
  formData: FormData
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const files = formData.getAll('files') as File[]
  if (!files.length) return { error: 'Sin archivos' }

  const results: string[] = []
  for (const file of files) {
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const filePath = `maintenance/${ticketId}/evidencia-${crypto.randomUUID()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: upErr } = await supabase.storage
      .from('maintenance-docs')
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (upErr) continue

    await supabase.from('maintenance_evidencias').insert({
      ticket_id:   ticketId,
      uploaded_by: user.id,
      file_name:   file.name,
      file_path:   filePath,
      file_size:   file.size,
      mime_type:   file.type,
      type:        'evidencia',
    })
    results.push(filePath)
  }

  revalidatePath(`/mantenimiento/${ticketId}`)
  revalidatePath(`/admin/mantenimiento/tickets/${ticketId}`)
  return { uploaded: results.length }
}
