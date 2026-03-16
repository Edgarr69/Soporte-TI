export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TicketList } from '@/components/tickets/ticket-list'

export default async function MyTicketsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, folio, status, priority, description, is_reopened,
      created_at, updated_at, first_response_at, resolved_at, closed_at,
      ticket_categories(name),
      ticket_subcategories(name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Mis tickets</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {tickets?.length ?? 0} solicitudes en total
            </p>
          </div>
        </div>
        <TicketList tickets={(tickets ?? []) as unknown as Parameters<typeof TicketList>[0]['tickets']} />
    </main>
  )
}
