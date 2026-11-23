import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Carga historial, comentarios y evidencias (con signed URLs) de un reporte
 * de seguridad. Quien llama ya validó que el usuario puede ver el reporte.
 *
 * `client` es el cliente con el que se leen historial y comentarios: el del
 * usuario (RLS filtra internos) o el de servicio en vistas admin.
 */
export async function loadSeguridadTicketChildren(
  client: SupabaseClient,
  ticketId: string,
  opts: { includeInternal: boolean },
) {
  let commentsQuery = client
    .from('seguridad_comments')
    .select('id, body, created_at, is_internal, author_id, author:profiles!author_id(full_name, email)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })
  if (!opts.includeInternal) commentsQuery = commentsQuery.eq('is_internal', false)

  const service = createAdminClient()
  const [{ data: history }, { data: comments }, { data: evidencias }] = await Promise.all([
    client
      .from('seguridad_status_history')
      .select('id, from_status, to_status, comment, created_at, changer:profiles!changed_by(full_name, email)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
    commentsQuery,
    service
      .from('seguridad_evidencias')
      .select('id, file_name, file_path, mime_type, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(100),
  ])

  // Bucket privado: signed URLs de 1 h generadas server-side
  const evList = evidencias ?? []
  const signedByPath = new Map<string, string>()
  if (evList.length > 0) {
    const { data: signed } = await service.storage
      .from('seguridad-docs')
      .createSignedUrls(evList.map((e) => e.file_path), 3600)
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl)
    }
  }

  type Person = { full_name: string | null; email: string }
  const one = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null)) as Person | null

  const statusHistory = (history ?? []).map((h) => ({
    id:          h.id as string,
    from_status: h.from_status as string | null,
    to_status:   h.to_status as string,
    comment:     h.comment as string | null,
    created_at:  h.created_at as string,
    changer:     one(h.changer),
  }))

  const last = statusHistory[statusHistory.length - 1]
  const isReopened = last?.to_status === 'pendiente' &&
    (last.from_status === 'terminado' || last.from_status === 'cancelado')

  return {
    statusHistory,
    isReopened,
    comments: (comments ?? []).map((c) => ({
      id:          c.id as string,
      body:        c.body as string,
      created_at:  c.created_at as string,
      is_internal: c.is_internal as boolean,
      author_id:   c.author_id as string | null,
      author:      one(c.author),
    })),
    evidencias: evList.map((e) => ({
      id:         e.id as string,
      file_name:  e.file_name as string,
      mime_type:  e.mime_type as string | null,
      created_at: e.created_at as string,
      url:        signedByPath.get(e.file_path) ?? null,
    })),
  }
}
