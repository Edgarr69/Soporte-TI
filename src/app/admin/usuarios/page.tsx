export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { UsersView } from '@/components/admin/users-view'
import { getAuthedProfile } from '@/lib/auth'

const PAGE_SIZE = 50

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  const allowed = ['super_admin', 'admin_sistemas', 'admin_mantenimiento']
  if (!profile || !allowed.includes(profile.role)) redirect('/dashboard')

  // Qué roles puede ver cada admin
  const visibleRoles: Record<string, string[]> = {
    super_admin:          ['usuario', 'admin_sistemas', 'admin_mantenimiento', 'super_admin', 'tecnico_mantenimiento'],
    admin_sistemas:       ['usuario'],
    admin_mantenimiento:  ['usuario', 'tecnico_mantenimiento'],
  }
  const rolesToShow = visibleRoles[profile.role] ?? ['usuario']

  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const [{ data: users, count }, { data: departments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, first_login_completed, created_at, department:departments(name)', { count: 'exact' })
      .in('role', rolesToShow)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase.from('departments').select('id, name').order('name'),
  ])

  return (
    <UsersView
      users={(users ?? []) as unknown as Parameters<typeof UsersView>[0]['users']}
      departments={departments ?? []}
      currentRole={profile.role}
      currentUserId={user.id}
      page={page}
      totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
      totalCount={count ?? 0}
    />
  )
}
