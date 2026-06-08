import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role key — salta RLS. Solo para uso server-side
 * en operaciones administrativas (gestión de usuarios, lecturas que
 * requieren ignorar políticas de profiles, etc).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
