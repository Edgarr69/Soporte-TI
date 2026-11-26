'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'

export type TicketModule = 'sistemas' | 'mantenimiento' | 'seguridad'

const MODULES: TicketModule[] = ['sistemas', 'mantenimiento', 'seguridad']

// ─── Eliminar ticket (solo super_admin) ───────────────────
// La función SQL admin_delete_ticket (migración 021) borra el ticket con
// todo lo que depende de él y reajusta el contador de folios si era el
// último emitido. Aquí solo se validan permisos y se limpian los archivos
// de Storage, que la base no puede borrar.

export async function deleteTicket(module: TicketModule, ticketId: string) {
  if (!MODULES.includes(module)) return { error: 'Módulo no válido' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: 'Solo el super administrador puede eliminar tickets' }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'Configuración de servidor incompleta' }
  const service = createAdminClient()

  // Archivos a borrar de Storage (se leen antes de que la función borre las filas)
  let bucket: string | null = null
  let files: string[] = []
  if (module === 'mantenimiento') {
    bucket = 'maintenance-docs'
    const { data } = await service.from('maintenance_evidencias').select('file_path').eq('ticket_id', ticketId)
    files = (data ?? []).map((r) => r.file_path).filter(Boolean)
  } else if (module === 'seguridad') {
    bucket = 'seguridad-docs'
    const { data } = await service.from('seguridad_evidencias').select('file_path').eq('ticket_id', ticketId)
    files = (data ?? []).map((r) => r.file_path).filter(Boolean)
  }

  // Se llama con la sesión del usuario: la función valida el rol con current_user_role()
  const { data, error } = await supabase.rpc('admin_delete_ticket', { p_module: module, p_id: ticketId })
  if (error) return { error: error.message }

  if (bucket && files.length) {
    const { error: stErr } = await service.storage.from(bucket).remove(files)
    if (stErr) console.error('[deleteTicket] storage:', stErr.message)
  }

  const result = data as { folio: string; folio_reajustado: boolean }

  if (module === 'sistemas') {
    revalidatePath('/admin/sistemas/tickets')
    revalidatePath('/admin/sistemas')
  } else if (module === 'mantenimiento') {
    revalidatePath('/admin/mantenimiento/tickets')
    revalidatePath('/admin/mantenimiento')
    revalidatePath('/tecnico')
  } else {
    revalidatePath('/admin/seguridad/tickets')
    revalidatePath('/admin/seguridad')
    revalidateTag('admin-seguridad-tickets', {})
  }
  revalidatePath('/mis-tickets')
  revalidatePath('/admin')

  return { success: true, folio: result.folio, folioReajustado: result.folio_reajustado }
}
