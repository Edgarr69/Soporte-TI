export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { getAuthedProfile } from '@/lib/auth'
import type { Role, Profile } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user || !profile) redirect('/login')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/80 dark:from-zinc-950 dark:to-zinc-900/80">
      <AppSidebar
        profile={profile as unknown as Profile}
        role={profile.role as Role}
        adminUnreadCount={unreadCount ?? 0}
      />
      <div className="sm:ml-[4.5rem] flex flex-col min-h-screen">
        <TopBar
          unreadCount={unreadCount ?? 0}
          userId={user.id}
          role={profile.role as Role}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
