export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHero } from '@/components/dashboard/user-dashboard'
import { homePathForRole, type Role } from '@/lib/types'
import type { ProfileExtended } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name, allowed_ticket_types)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')
  if (profile.role !== 'usuario') redirect(homePathForRole(profile.role as Role))

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-20 lg:pb-10">
      <DashboardHero profile={profile as unknown as ProfileExtended & { department?: { name: string } }} />
    </main>
  )
}
