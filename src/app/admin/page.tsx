export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { homePathForRole, type Role } from '@/lib/types'

export default async function AdminRootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'usuario') as Role

  // Si no es super_admin, redirigir a su módulo
  if (role !== 'super_admin') {
    redirect(homePathForRole(role))
  }

  // super_admin → dashboard de sistemas como home por defecto
  redirect('/admin/sistemas')
}
