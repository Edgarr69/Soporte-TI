import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/shared/app-sidebar'
import { TopBar } from '@/components/shared/top-bar'
import { isAdminAny, type Role } from '@/lib/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile || !isAdminAny(profile.role as Role)) redirect('/dashboard')

  const { data: adminUnreadData } = await supabase.rpc('get_admin_unread_count')
  const adminUnread = (adminUnreadData as number | null) ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100/80 dark:from-zinc-950 dark:to-zinc-900/80">
      <AppSidebar
        profile={profile}
        role={profile.role as Role}
        adminUnreadCount={adminUnread}
      />
      <div className="sm:ml-[4.5rem] flex flex-col min-h-screen">
        <TopBar
          unreadCount={adminUnread}
          userId={user.id}
          role={profile.role as Role}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
