export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersView } from '@/components/admin/users-view'

export default async function AdminUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const allowed = ['super_admin', 'admin_sistemas', 'admin_mantenimiento']
  if (!profile || !allowed.includes(profile.role)) redirect('/dashboard')

  // Qué roles puede ver cada admin
  const visibleRoles: Record<string, string[]> = {
    super_admin:          ['usuario', 'admin_sistemas', 'admin_mantenimiento', 'super_admin', 'tecnico_mantenimiento'],
    admin_sistemas:       ['usuario'],
    admin_mantenimiento:  ['usuario', 'tecnico_mantenimiento'],
  }
  const rolesToShow = visibleRoles[profile.role] ?? ['usuario']

  const [{ data: users }, { data: departments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, first_login_completed, created_at, department:departments(name)')
      .in('role', rolesToShow)
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('id, name').order('name'),
  ])

  return (
    <UsersView
      users={(users ?? []) as unknown as Parameters<typeof UsersView>[0]['users']}
      departments={departments ?? []}
      currentRole={profile.role}
      currentUserId={user.id}
    />
  )
}
