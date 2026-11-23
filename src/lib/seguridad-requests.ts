import { createAdminClient } from '@/lib/supabase/admin'
import type { MaintenanceType, NivelRiesgo } from '@/lib/types'

export interface PendingMantRequest {
  id: string
  folio: string
  category: string | null
  nivelRiesgo: NivelRiesgo
  area: string | null
  ubicacion: string
  descripcion: string
  type: MaintenanceType
  servicio: string
  note: string | null
  requestedAt: string
  requestedBy: string
  photoUrl: string | null
}

/**
 * Solicitudes de apoyo de Seguridad e Higiene pendientes de respuesta por
 * Mantenimiento. Quien llama ya validó el rol (service role: el admin de
 * mantenimiento no tiene RLS sobre las tablas de seguridad).
 */
export async function getPendingMantRequests(): Promise<PendingMantRequest[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('seguridad_tickets')
    .select(`
      id, folio, category_name_snapshot, nivel_riesgo, area_name_snapshot, ubicacion, descripcion,
      mant_request_type, mant_request_servicio, mant_request_note, mant_requested_at,
      requester:profiles!mant_requested_by(full_name, email)
    `)
    .eq('mant_request_status', 'pendiente')
    .order('mant_requested_at', { ascending: true })
    .limit(20)
  if (error) {
    // p.ej. migración 015 sin aplicar — no romper el layout admin
    console.error('[getPendingMantRequests]', error.message)
    return []
  }
  const rows = data ?? []
  if (!rows.length) return []

  // Primera foto de cada reporte (signed URL 1 h)
  const { data: fotos } = await db
    .from('seguridad_evidencias')
    .select('ticket_id, file_path')
    .in('ticket_id', rows.map((r) => r.id))
    .in('mime_type', ['image/jpeg', 'image/jpg', 'image/png'])
    .order('created_at', { ascending: true })
  const firstByTicket = new Map<string, string>()
  for (const f of fotos ?? []) if (!firstByTicket.has(f.ticket_id)) firstByTicket.set(f.ticket_id, f.file_path)
  const urlByPath = new Map<string, string>()
  if (firstByTicket.size) {
    const { data: signed } = await db.storage
      .from('seguridad-docs')
      .createSignedUrls([...firstByTicket.values()], 3600)
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl)
  }

  return rows.map((r) => {
    const req = (Array.isArray(r.requester) ? r.requester[0] : r.requester) as { full_name: string | null; email: string } | null
    const path = firstByTicket.get(r.id)
    return {
      id:          r.id,
      folio:       r.folio,
      category:    r.category_name_snapshot,
      nivelRiesgo: r.nivel_riesgo as NivelRiesgo,
      area:        r.area_name_snapshot,
      ubicacion:   r.ubicacion,
      descripcion: r.descripcion,
      type:        (r.mant_request_type ?? 'general') as MaintenanceType,
      servicio:    r.mant_request_servicio ?? '',
      note:        r.mant_request_note,
      requestedAt: r.mant_requested_at,
      requestedBy: req?.full_name ?? req?.email ?? 'Seguridad e Higiene',
      photoUrl:    path ? (urlByPath.get(path) ?? null) : null,
    }
  })
}
