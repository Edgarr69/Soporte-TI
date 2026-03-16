export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewTicketForm } from '@/components/tickets/new-ticket-form'

export default async function NewTicketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const { data: categories } = await supabase
    .from('ticket_categories')
    .select('id, name, icon')
    .order('sort_order')

  const { data: subcategories } = await supabase
    .from('ticket_subcategories')
    .select('id, category_id, name, base_score')
    .order('sort_order')

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Reportar problema
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Completa el formulario con todos los detalles del problema
          </p>
        </div>
        <NewTicketForm
          categories={categories ?? []}
          subcategories={subcategories ?? []}
          profile={profile}
        />
    </main>
  )
}
