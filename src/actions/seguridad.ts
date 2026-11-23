'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import path from 'path'
import type { NivelRiesgo, SeguridadStatus } from '@/lib/types'
import { NIVELES_RIESGO, NIVEL_RIESGO_LABELS, SEGURIDAD_TRANSITIONS } from '@/lib/types'
import { createAdminNotification } from '@/actions/admin-notifications'

const ADMIN_ROLES = ['admin_seguridad', 'super_admin']
const BUCKET      = 'seguridad-docs'
const MAX_FILE    = 10 * 1024 * 1024

// Extensión derivada del MIME ya validado — nunca del nombre del archivo
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg':      'jpg',
  'image/jpg':       'jpg',
  'image/png':       'png',
  'application/pdf': 'pdf',
}
const PHOTO_MIMES    = ['image/jpeg', 'image/jpg', 'image/png']
const EVIDENCE_MIMES = [...PHOTO_MIMES, 'application/pdf']

type Supa = Awaited<ReturnType<typeof createClient>>

async function getAdmin(supabase: Supa) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || !ADMIN_ROLES.includes(profile.role)) return { error: 'Sin permiso' as const }
  return { user, profile, name: profile.full_name ?? profile.email ?? 'Admin' }
}

function minutesSince(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000)
}

function revalidateTicket(ticketId: string) {
  revalidatePath('/admin/seguridad/tickets')
  revalidatePath(`/admin/seguridad/tickets/${ticketId}`)
  revalidatePath(`/seguridad/${ticketId}`)
  revalidatePath('/mis-tickets')
  revalidateTag('admin-seguridad-tickets', {})
}

// ─── Crear reporte (usuario) ──────────────────────────────

export async function createSeguridadReport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const category_id  = (formData.get('category_id') as string) || ''
  const area_id      = (formData.get('area_id') as string) || ''
  const nivelRaw     = formData.get('nivel_riesgo') as string
  const ubicacion    = ((formData.get('ubicacion') as string) ?? '').trim()
  const descripcion  = ((formData.get('descripcion') as string) ?? '').trim()
  const photoFile    = formData.get('photo') as File | null

  if (!NIVELES_RIESGO.includes(nivelRaw as NivelRiesgo)) return { error: 'Nivel de riesgo no válido' }
  const nivel_riesgo = nivelRaw as NivelRiesgo
  if (!category_id) return { error: 'Selecciona una categoría' }
  if (!area_id)     return { error: 'Selecciona el área' }
  if (ubicacion.length < 3)    return { error: 'Indica la ubicación (mínimo 3 caracteres)' }
  if (ubicacion.length > 200)  return { error: 'La ubicación no puede superar 200 caracteres' }
  if (descripcion.length < 10) return { error: 'La descripción es obligatoria (mínimo 10 caracteres)' }
  if (descripcion.length > 5000) return { error: 'La descripción no puede superar 5000 caracteres' }

  // Los snapshots se leen de la BD, no del cliente
  const [{ data: profile }, { data: category }, { data: area }] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, email, department_id, department:departments(name)')
      .eq('id', user.id).single(),
    supabase.from('seguridad_categories').select('name, is_active').eq('id', category_id).single(),
    supabase.from('areas').select('name, is_active').eq('id', area_id).single(),
  ])
  if (!category?.is_active) return { error: 'Categoría no válida' }
  if (!area?.is_active)     return { error: 'Área no válida' }

  const dept = profile?.department as unknown as { name: string } | { name: string }[] | null
  const deptName = Array.isArray(dept) ? (dept[0]?.name ?? null) : (dept?.name ?? null)

  const { data: ticket, error: insertErr } = await supabase
    .from('seguridad_tickets')
    .insert({
      user_id:                  user.id,
      department_id:            profile?.department_id ?? null,
      department_name_snapshot: deptName,
      area_id,
      area_name_snapshot:       area.name,
      category_id,
      category_name_snapshot:   category.name,
      nivel_riesgo,
      ubicacion,
      descripcion,
      status:                   'pendiente',
    })
    .select('id, folio')
    .single()

  if (insertErr || !ticket) {
    console.error('[createSeguridadReport] insert error:', insertErr?.message)
    return { error: 'Error al crear el reporte. Por favor intenta de nuevo.' }
  }

  // Foto opcional — se sube con service role (bucket privado)
  if (photoFile && photoFile.size > 0) {
    if (!PHOTO_MIMES.includes(photoFile.type) || photoFile.size > MAX_FILE) {
      console.error('[createSeguridadReport] foto rechazada:', photoFile.type, photoFile.size)
    } else {
      try {
        const service  = createAdminClient()
        const ext      = MIME_TO_EXT[photoFile.type] ?? 'jpg'
        const filePath = `seguridad/${ticket.id}/foto-${crypto.randomUUID()}.${ext}`
        const buf      = Buffer.from(await photoFile.arrayBuffer())
        const { error: upErr } = await service.storage
          .from(BUCKET).upload(filePath, buf, { contentType: photoFile.type })
        if (!upErr) {
          await service.from('seguridad_evidencias').insert({
            ticket_id:   ticket.id,
            uploaded_by: user.id,
            file_name:   path.basename(photoFile.name).slice(0, 255),
            file_path:   filePath,
            file_size:   photoFile.size,
            mime_type:   photoFile.type,
          })
        } else {
          console.error('[createSeguridadReport] upload failed:', upErr.message)
        }
      } catch (e) {
        console.error('[createSeguridadReport] photo upload failed:', e)
      }
    }
  }

  const creatorName = profile?.full_name ?? profile?.email ?? 'Usuario'

  const [, { error: notifErr }] = await Promise.all([
    supabase.from('seguridad_status_history').insert({
      ticket_id:   ticket.id,
      changed_by:  user.id,
      from_status: null,
      to_status:   'pendiente',
      comment:     'Reporte creado',
    }),
    supabase.from('notifications').insert({
      user_id:   user.id,
      ticket_id: null,
      type:      'ticket_created',
      module:    'seguridad',
      title:     'Reporte de seguridad creado',
      body:      `${creatorName} ha creado el reporte ${ticket.folio} (riesgo ${NIVEL_RIESGO_LABELS[nivel_riesgo].toLowerCase()})`,
    }),
    createAdminNotification({
      title:       nivel_riesgo === 'critico' ? '⚠ Reporte de riesgo CRÍTICO' : 'Nuevo reporte de seguridad',
      message:     `${creatorName} reportó "${category.name}" en ${area.name} (${ticket.folio})`,
      type:        'seguridad_created',
      module:      'seguridad',
      actorId:     user.id,
      actorName:   creatorName,
      targetId:    ticket.id,
      targetType:  'seguridad_ticket',
      targetFolio: ticket.folio,
      metadata:    { nivel_riesgo },
    }),
  ])
  if (notifErr) console.error('[createSeguridadReport] notification insert failed:', notifErr.message)

  revalidatePath('/mis-tickets')
  revalidatePath('/notificaciones')
  revalidateTag('admin-seguridad-tickets', {})
  return { ticket }
}

// ─── Cambiar estado (admin) ───────────────────────────────

export async function changeSeguridadStatus(
  ticketId: string,
  newStatus: SeguridadStatus,
  options?: { comment?: string; cancel_reason?: string; acciones_correctivas?: string },
) {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }

  const { data: ticket } = await supabase
    .from('seguridad_tickets')
    .select('status, user_id, folio, created_at, reviewed_at, acciones_correctivas, mant_request_status, resolved_by_mantenimiento')
    .eq('id', ticketId)
    .single()
  if (!ticket) return { error: 'Reporte no encontrado' }

  const from = ticket.status as SeguridadStatus
  if (!SEGURIDAD_TRANSITIONS[from]?.includes(newStatus))
    return { error: 'Transición de estado no válida' }

  // Mientras Mantenimiento tiene el reporte, solo Mantenimiento lo cierra
  if (newStatus === 'terminado' || newStatus === 'cancelado') {
    if (ticket.mant_request_status === 'pendiente')
      return { error: 'Hay una solicitud de apoyo pendiente con Mantenimiento. Retírala primero.' }
    if (ticket.mant_request_status === 'aceptada')
      return { error: 'Este reporte lo está atendiendo Mantenimiento; se cerrará cuando terminen.' }
  }

  const comment  = options?.comment?.trim()  || undefined
  const acciones = options?.acciones_correctivas?.trim() || undefined
  if (comment && comment.length > 2000) return { error: 'El comentario es demasiado largo' }
  if (acciones && acciones.length > 5000) return { error: 'Las acciones correctivas no pueden superar 5000 caracteres' }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'en_revision' && !ticket.reviewed_at) {
    updates.reviewed_at            = now
    updates.first_response_minutes = minutesSince(ticket.created_at)
  }
  if (newStatus === 'en_proceso') updates.started_at = now
  if (newStatus === 'terminado') {
    if (!acciones && !ticket.acciones_correctivas?.trim())
      return { error: 'Registra las acciones correctivas antes de marcar como atendido' }
    if (acciones) updates.acciones_correctivas = acciones
    updates.finished_at             = now
    updates.resolution_time_minutes = minutesSince(ticket.created_at)
  }
  if (newStatus === 'cancelado') {
    updates.cancelled_at  = now
    updates.cancel_reason = options?.cancel_reason?.trim() || null
  }
  const wasReopened = newStatus === 'pendiente' && (from === 'terminado' || from === 'cancelado')
  if (wasReopened) {
    updates.finished_at             = null
    updates.cancelled_at            = null
    updates.cancel_reason           = null
    updates.resolution_time_minutes = null
    // Si lo había cerrado Mantenimiento, Seguridad recupera el control
    // (maintenance_ticket_id se conserva como referencia)
    if (ticket.resolved_by_mantenimiento) {
      updates.resolved_by_mantenimiento = false
      updates.mant_request_status       = null
    }
  }

  const { error } = await supabase.from('seguridad_tickets').update(updates).eq('id', ticketId)
  if (error) return { error: error.message }

  const { error: histErr } = await supabase.from('seguridad_status_history').insert({
    ticket_id:   ticketId,
    changed_by:  admin.user.id,
    from_status: from,
    to_status:   newStatus,
    comment:     comment ?? (newStatus === 'cancelado' ? options?.cancel_reason?.trim() || null : null),
  })
  if (histErr) console.error('[changeSeguridadStatus] historial insert failed:', histErr.message)

  const userVerbs: Record<SeguridadStatus, string> = {
    pendiente:   wasReopened ? 'reabrió tu reporte' : 'regresó tu reporte a pendiente',
    en_revision: 'está revisando tu reporte',
    en_proceso:  'está atendiendo tu reporte',
    terminado:   'marcó tu reporte como atendido',
    cancelado:   'canceló tu reporte',
  }
  const adminTitles: Record<SeguridadStatus, string> = {
    pendiente:   wasReopened ? 'Reporte reabierto' : 'Reporte actualizado',
    en_revision: 'Reporte en revisión',
    en_proceso:  'Reporte en atención',
    terminado:   'Reporte atendido',
    cancelado:   'Reporte cancelado',
  }
  const adminVerbs: Record<SeguridadStatus, string> = {
    pendiente:   wasReopened ? 'reabrió' : 'regresó a pendiente',
    en_revision: 'puso en revisión',
    en_proceso:  'puso en atención',
    terminado:   'marcó como atendido',
    cancelado:   'canceló',
  }
  const adminType = newStatus === 'terminado' ? 'seguridad_closed'
    : newStatus === 'cancelado' ? 'seguridad_cancelled'
    : wasReopened ? 'seguridad_reopened'
    : 'seguridad_status_changed'

  await Promise.all([
    supabase.from('notifications').insert({
      user_id:   ticket.user_id,
      ticket_id: null,
      type:      wasReopened ? 'ticket_reopened' : 'status_changed',
      module:    'seguridad',
      title:     `Reporte ${ticket.folio} actualizado`,
      body:      `${admin.name} ${userVerbs[newStatus]}${comment ? `: ${comment}` : ''}`,
    }),
    createAdminNotification({
      title:       adminTitles[newStatus],
      message:     `${admin.name} ${adminVerbs[newStatus]} el reporte ${ticket.folio}${comment ? `: ${comment}` : ''}`,
      type:        adminType,
      module:      'seguridad',
      actorId:     admin.user.id,
      actorName:   admin.name,
      targetId:    ticketId,
      targetType:  'seguridad_ticket',
      targetFolio: ticket.folio,
    }),
  ])

  revalidateTicket(ticketId)
  return { success: true }
}

// ─── Actualizar atención: acciones correctivas / riesgo (admin) ─

export async function updateSeguridadAtencion(
  ticketId: string,
  data: { acciones_correctivas?: string; nivel_riesgo?: NivelRiesgo },
) {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }

  const updates: Record<string, unknown> = {}
  if (data.acciones_correctivas !== undefined) {
    const acciones = data.acciones_correctivas.trim()
    if (acciones.length > 5000) return { error: 'Las acciones correctivas no pueden superar 5000 caracteres' }
    updates.acciones_correctivas = acciones || null
  }
  if (data.nivel_riesgo !== undefined) {
    if (!NIVELES_RIESGO.includes(data.nivel_riesgo)) return { error: 'Nivel de riesgo no válido' }
    updates.nivel_riesgo = data.nivel_riesgo
  }
  if (!Object.keys(updates).length) return { success: true }

  const { error } = await supabase.from('seguridad_tickets').update(updates).eq('id', ticketId)
  if (error) return { error: error.message }

  revalidateTicket(ticketId)
  return { success: true }
}

// ─── Comentarios ──────────────────────────────────────────

export async function addSeguridadComment(ticketId: string, body: string, isInternal = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [{ data: ticket }, { data: profile }] = await Promise.all([
    supabase.from('seguridad_tickets').select('user_id, folio').eq('id', ticketId).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])
  if (!ticket) return { error: 'Reporte no encontrado' }

  const isAdmin = ADMIN_ROLES.includes(profile?.role ?? '')
  const isOwner = ticket.user_id === user.id
  if (!isOwner && !isAdmin) return { error: 'Sin permiso' }
  if (isInternal && !isAdmin) return { error: 'Sin permiso para comentarios internos' }

  if (!body?.trim()) return { error: 'El comentario no puede estar vacío' }
  if (body.length > 5000) return { error: 'El comentario no puede superar 5000 caracteres' }

  const { error } = await supabase.from('seguridad_comments').insert({
    ticket_id:   ticketId,
    author_id:   user.id,
    body,
    is_internal: isInternal,
  })
  if (error) return { error: 'Error al guardar el comentario' }

  if (!isInternal && !isOwner) {
    await supabase.from('notifications').insert({
      user_id:   ticket.user_id,
      ticket_id: null,
      type:      'comment_added',
      module:    'seguridad',
      title:     `Nuevo comentario en ${ticket.folio}`,
      body:      body.slice(0, 120),
    })
  }

  revalidatePath(`/seguridad/${ticketId}`)
  revalidatePath(`/admin/seguridad/tickets/${ticketId}`)
  return { success: true }
}

// ─── Cancelar (usuario dueño, solo en pendiente) ──────────

export async function cancelSeguridadReport(ticketId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: ticket } = await supabase
    .from('seguridad_tickets').select('status, user_id, folio').eq('id', ticketId).single()
  if (!ticket || ticket.user_id !== user.id) return { error: 'Reporte no encontrado' }
  if (ticket.status !== 'pendiente') return { error: 'Solo puedes cancelar reportes pendientes' }

  const cancel_reason = reason?.trim().slice(0, 2000) || null
  const { error } = await supabase
    .from('seguridad_tickets')
    .update({ status: 'cancelado', cancelled_at: new Date().toISOString(), cancel_reason })
    .eq('id', ticketId)
  if (error) return { error: error.message }

  await supabase.from('seguridad_status_history').insert({
    ticket_id:   ticketId,
    changed_by:  user.id,
    from_status: 'pendiente',
    to_status:   'cancelado',
    comment:     cancel_reason ?? 'Cancelado por el usuario',
  })

  revalidateTicket(ticketId)
  return { success: true }
}

// ─── Evidencias ───────────────────────────────────────────

export async function uploadSeguridadEvidencia(ticketId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const [{ data: ticket }, { data: profile }] = await Promise.all([
    supabase.from('seguridad_tickets').select('user_id').eq('id', ticketId).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])
  if (!ticket) return { error: 'Reporte no encontrado' }
  const isAdmin = ADMIN_ROLES.includes(profile?.role ?? '')
  if (!isAdmin && ticket.user_id !== user.id) return { error: 'Sin permiso' }

  const files = formData.getAll('files') as File[]
  if (!files.length) return { error: 'No se seleccionó ningún archivo' }
  if (files.length > 10) return { error: 'Máximo 10 archivos a la vez' }

  const service = createAdminClient()
  let uploaded = 0
  for (const file of files) {
    if (!EVIDENCE_MIMES.includes(file.type)) return { error: `Tipo de archivo no permitido: ${file.name}` }
    if (file.size > MAX_FILE) return { error: `${file.name} supera 10 MB` }

    const ext      = MIME_TO_EXT[file.type] ?? 'bin'
    const filePath = `seguridad/${ticketId}/evidencia-${crypto.randomUUID()}.${ext}`
    const buf      = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await service.storage
      .from(BUCKET).upload(filePath, buf, { contentType: file.type })
    if (upErr) return { error: `Error subiendo ${file.name}` }

    const { error: dbErr } = await service.from('seguridad_evidencias').insert({
      ticket_id:   ticketId,
      uploaded_by: user.id,
      file_name:   path.basename(file.name).slice(0, 255),
      file_path:   filePath,
      file_size:   file.size,
      mime_type:   file.type,
    })
    if (dbErr) {
      await service.storage.from(BUCKET).remove([filePath])
      return { error: `Error registrando ${file.name}` }
    }
    uploaded++
  }

  revalidatePath(`/seguridad/${ticketId}`)
  revalidatePath(`/admin/seguridad/tickets/${ticketId}`)
  return { success: true, uploaded }
}

export async function deleteSeguridadEvidencia(evidenciaId: string, ticketId: string) {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }

  const service = createAdminClient()
  const { data: ev } = await service
    .from('seguridad_evidencias')
    .select('file_path, ticket_id')
    .eq('id', evidenciaId)
    .single()
  if (!ev || ev.ticket_id !== ticketId) return { error: 'Archivo no encontrado' }

  const { error } = await service.from('seguridad_evidencias').delete().eq('id', evidenciaId)
  if (error) return { error: 'Error al eliminar el archivo' }
  await service.storage.from(BUCKET).remove([ev.file_path])

  revalidatePath(`/admin/seguridad/tickets/${ticketId}`)
  revalidatePath(`/seguridad/${ticketId}`)
  return { success: true }
}

// ─── Catálogo de categorías (admin) ───────────────────────

type Res = { error?: string; success?: boolean }

function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'El nombre no puede estar vacío'
  if (trimmed.length > 255) return 'El nombre es demasiado largo (máx. 255 caracteres)'
  return null
}

function revalidateCategories() {
  revalidatePath('/admin/seguridad/catalogos')
  revalidateTag('seguridad-categories', {})
}

export async function createSeguridadCategory(name: string): Promise<Res> {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }
  const nameErr = validateName(name); if (nameErr) return { error: nameErr }

  const { data: last } = await supabase
    .from('seguridad_categories').select('sort_order')
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()

  const { error } = await supabase.from('seguridad_categories').insert({
    name: name.trim(), sort_order: (last?.sort_order ?? 0) + 1,
  })
  if (error) return { error: error.message }
  revalidateCategories()
  return { success: true }
}

export async function updateSeguridadCategory(id: string, name: string, is_active: boolean): Promise<Res> {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }
  const nameErr = validateName(name); if (nameErr) return { error: nameErr }

  const { error } = await supabase
    .from('seguridad_categories').update({ name: name.trim(), is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidateCategories()
  return { success: true }
}

export async function deleteSeguridadCategory(id: string): Promise<Res> {
  const supabase = await createClient()
  const admin = await getAdmin(supabase)
  if ('error' in admin) return { error: admin.error }

  // Los reportes conservan category_name_snapshot (FK con ON DELETE SET NULL)
  const { error } = await supabase.from('seguridad_categories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateCategories()
  return { success: true }
}
