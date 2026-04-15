export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHero, UserDashboard } from '@/components/dashboard/user-dashboard'
import { Skeleton } from '@/components/ui/skeleton'
import { isAdminAny, homePathForRole, type Role } from '@/lib/types'
import type { ProfileExtended } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')
  if (isAdminAny(profile.role as Role)) redirect(homePathForRole(profile.role as Role))

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-10 pb-20 lg:pb-10">
      {/* Saludo + accesos rápidos: aparece inmediatamente */}
      <DashboardHero profile={profile as unknown as ProfileExtended & { department?: { name: string } }} />

      {/* Datos de tickets y notificaciones: streameados */}
      <Suspense fallback={<DashboardActivitySkeleton />}>
        <DashboardActivity userId={user.id} profile={profile} />
      </Suspense>
    </main>
  )
}

async function DashboardActivity({
  userId,
  profile,
}: {
  userId: string
  profile: Record<string, unknown>
}) {
  const supabase = await createClient()

  const [
    { data: sysTickets },
    { data: maintTickets },
    { data: recentNotifs },
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, folio, status, priority, created_at, updated_at, ticket_categories(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('maintenance_tickets')
      .select('id, folio, type, status, servicio, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return (
    <UserDashboard
      profile={profile as unknown as Parameters<typeof UserDashboard>[0]['profile']}
      sysTickets={(sysTickets ?? []) as unknown as Parameters<typeof UserDashboard>[0]['sysTickets']}
      maintTickets={maintTickets ?? []}
      recentNotifs={recentNotifs ?? []}
    />
  )
}

function DashboardActivitySkeleton() {
  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Stat cards */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
      {/* Recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      </div>
    </div>
  )
}
