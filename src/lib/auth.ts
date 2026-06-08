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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name, allowed_ticket_types)')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
})
