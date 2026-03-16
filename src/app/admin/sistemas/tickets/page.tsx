export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { AdminTicketList } from '@/components/admin/admin-ticket-list'

export default async function AdminTicketsPage() {
  const supabase = await createClient()

  const { data: tickets } = await supabase
    .from('tickets')
    .select(`
      id, folio, status, priority, description, is_reopened,
      created_at, updated_at, first_response_at, resolved_at,
      ticket_categories(name),
      ticket_subcategories(name),
      user:profiles(full_name, email),
      department:departments(name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Todos los tickets</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {tickets?.length ?? 0} tickets en total
        </p>
      </div>
      <AdminTicketList tickets={(tickets ?? []) as unknown as Parameters<typeof AdminTicketList>[0]['tickets']} />
    </div>
  )
}
