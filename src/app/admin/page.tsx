export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { homePathForRole, type Role } from '@/lib/types'
import { getAuthedProfile } from '@/lib/auth'

export default async function AdminRootPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  const role = (profile?.role ?? 'usuario') as Role

  // Si no es super_admin, redirigir a su módulo
  if (role !== 'super_admin') {
    redirect(homePathForRole(role))
  }

  // super_admin → dashboard de sistemas como home por defecto
  redirect('/admin/sistemas')
}
