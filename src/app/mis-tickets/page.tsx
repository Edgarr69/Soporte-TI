export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { MisTicketsTabs } from '@/components/tickets/mis-tickets-tabs'
import { LinkButton } from '@/components/ui/link-button'
import { ChevronLeft } from 'lucide-react'
import { getAuthedProfile } from '@/lib/auth'

export default async function MisTicketsPage() {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const [{ data: sysTickets }, { data: maintTickets }] =
    await Promise.all([
      supabase
        .from('tickets')
        .select('id, folio, status, priority, description, is_reopened, created_at, ticket_categories(name), ticket_subcategories(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('maintenance_tickets')
        .select('id, folio, type, status, servicio, descripcion, created_at, encargado_nombre')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  const normalizedSysTickets = (sysTickets ?? []).map((t) => ({
    ...t,
    ticket_categories:    Array.isArray(t.ticket_categories)    ? (t.ticket_categories[0]    ?? null) : t.ticket_categories,
    ticket_subcategories: Array.isArray(t.ticket_subcategories) ? (t.ticket_subcategories[0] ?? null) : t.ticket_subcategories,
  }))
  const generalTickets = (maintTickets ?? []).filter((t) => t.type === 'general')
  const maqTickets     = (maintTickets ?? []).filter((t) => t.type === 'maquinaria')

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <LinkButton href="/dashboard" variant="ghost" size="sm" className="-ml-2 mb-3">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Inicio
          </LinkButton>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Mis tickets</h1>
        </div>
        <MisTicketsTabs
          sysTickets={normalizedSysTickets as unknown as Parameters<typeof MisTicketsTabs>[0]['sysTickets']}
          generalTickets={generalTickets ?? []}
          maqTickets={maqTickets ?? []}
          canMaquinaria={(profile?.department?.allowed_ticket_types ?? ['general', 'maquinaria']).includes('maquinaria')}
        />
    </main>
  )
}
