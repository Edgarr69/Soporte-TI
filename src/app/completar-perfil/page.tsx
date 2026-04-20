export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompleteProfileForm } from '@/components/auth/complete-profile-form'
import { Headphones } from 'lucide-react'
import { homePathForRole, type Role } from '@/lib/types'

export default async function CompleteProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_login_completed, full_name, department_id, encargado_nombre')
    .eq('id', user.id)
    .single()

  if (profile?.first_login_completed) redirect(homePathForRole(profile.role as Role))

  const { data: departments } = await supabase
    .from('departments').select('id, name').order('name')

  // Encargado default del departamento si ya está seleccionado
  let defaultManager = ''
  if (profile?.department_id) {
    const { data: mgr } = await supabase
      .from('department_managers')
      .select('manager_name')
      .eq('department_id', profile.department_id)
      .eq('is_default', true)
      .single()
    defaultManager = mgr?.manager_name ?? ''
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-zinc-900 dark:bg-zinc-100 rounded-2xl">
              <Headphones aria-hidden="true" className="h-7 w-7 text-zinc-100 dark:text-zinc-900" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Bienvenido al sistema</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Antes de continuar, completa tu perfil
          </p>
        </div>

        <CompleteProfileForm
          departments={departments ?? []}
          defaultManager={defaultManager}
          userEmail={user.email ?? ''}
          prefilled={{
            full_name:        profile?.full_name,
            department_id:    profile?.department_id,
            encargado_nombre: profile?.encargado_nombre,
          }}
        />
      </div>
    </div>
  )
}
