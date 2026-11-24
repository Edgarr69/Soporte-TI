export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { SeguridadRequestsModal } from '@/components/mantenimiento/seguridad-requests-modal'
import { getAuthedProfile } from '@/lib/auth'
import { getPendingMantRequests } from '@/lib/seguridad-requests'
import { isAdminAny, type Role } from '@/lib/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !isAdminAny(profile.role as Role)) redirect('/dashboard')

  const role = profile.role as Role
  const canSeeSegRequests = role === 'admin_mantenimiento' || role === 'super_admin'

  const [{ data: adminUnreadData }, segRequests] = await Promise.all([
    supabase.rpc('get_admin_unread_count'),
    canSeeSegRequests ? getPendingMantRequests() : Promise.resolve([]),
  ])
  const adminUnread = (adminUnreadData as number | null) ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/80 dark:from-zinc-950 dark:to-zinc-900/80">
      <AppSidebar
        profile={profile}
        role={role}
        adminUnreadCount={adminUnread}
      />
      <div className="sidebar-offset min-w-0 flex flex-col h-dvh overflow-hidden">
        <TopBar
          unreadCount={adminUnread}
          userId={user.id}
          role={role}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8 flex flex-col">
          {children}
        </main>
      </div>
      {canSeeSegRequests && <SeguridadRequestsModal requests={segRequests} role={role} />}
    </div>
  )
}
