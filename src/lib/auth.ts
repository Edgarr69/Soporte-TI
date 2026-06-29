import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Resuelve usuario autenticado + su perfil una sola vez por request.
 * cache() de React deduplica la llamada entre el layout y la page de
 * un mismo segmento (ambos la invocan; Supabase solo se consulta una vez).
 *
 * El select trae todas las columnas de profiles + el join a departments
 * con el set de campos más amplio que se usa en la app, de forma que
 * cubre tanto los usos que solo necesitan `role` como los que necesitan
 * el perfil completo con `department.allowed_ticket_types`.
 */
export const getAuthedProfile = cache(async () => {
  const supabase = await createClient()

  // Ambas queries en paralelo — RLS de profiles filtra por auth.uid() automáticamente
  const [{ data: { user } }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('profiles')
      .select('*, department:departments(id, name, allowed_ticket_types)')
      .single(),
  ])

  if (!user) return { supabase, user: null, profile: null }
  return { supabase, user, profile }
})

export const getUnreadCount = cache(async (userId: string) => {
  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
})
