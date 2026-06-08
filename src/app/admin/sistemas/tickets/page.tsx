export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminTicketList } from '@/components/admin/admin-ticket-list'
import { getAuthedProfile } from '@/lib/auth'

const PAGE_SIZE = 30

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; page?: string }>
}) {
  const params = await searchParams
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_sistemas', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('tickets')
    .select(`
      id, folio, status, priority, description, is_reopened,
      created_at,
      ticket_categories(name),
      ticket_subcategories(name),
      user:profiles(full_name, email),
      department:departments(name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status)   query = query.eq('status', params.status)
  if (params.priority) query = query.eq('priority', params.priority)

  const { data: tickets, count } = await query

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Todos los tickets</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          {count ?? 0} tickets en total
        </p>
      </div>
      <AdminTicketList
        tickets={(tickets ?? []) as unknown as Parameters<typeof AdminTicketList>[0]['tickets']}
        currentFilters={{ status: params.status, priority: params.priority }}
        page={page}
        totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
      />
    </div>
  )
}
