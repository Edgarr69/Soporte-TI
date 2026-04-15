export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { TecnicosView } from '@/components/mantenimiento/tecnicos-view'

export default async function TecnicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  // Usar service role para saltarse RLS en profiles
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data: tecnicos, error } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('role', 'tecnico_mantenimiento')
    .order('full_name')

  if (error) console.error('[TecnicosPage] error:', error)

  return (
    <TecnicosView
      tecnicos={(tecnicos ?? []) as { id: string; email: string; full_name: string | null; created_at: string }[]}
    />
  )
}
