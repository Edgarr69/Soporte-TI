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

  // getClaims() valida la firma del JWT localmente (el proyecto usa llaves
  // asimétricas ES256), sin ir a Supabase Auth ni a la base en cada página.
  // La prueba de carga mostró que getUser() en cada request era una de las
  // consultas más frecuentes de la base. Las Server Actions siguen usando
  // getUser() (verificación completa contra Auth) porque escriben datos.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  if (!claims?.sub) return { supabase, user: null, profile: null }
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? undefined }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name, allowed_ticket_types)')
    .eq('id', user.id)
    .single()

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
