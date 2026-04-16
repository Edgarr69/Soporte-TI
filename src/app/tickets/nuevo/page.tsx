export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewTicketForm } from '@/components/tickets/new-ticket-form'
import { getCachedTicketCategories, getCachedTicketSubcategories } from '@/lib/catalog-cache'
import { LinkButton } from '@/components/ui/link-button'
import { ChevronLeft } from 'lucide-react'

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

  const [categories, subcategories] = await Promise.all([
    getCachedTicketCategories(),
    getCachedTicketSubcategories(),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <LinkButton href="/dashboard" variant="ghost" size="sm" className="-ml-2 mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Panel principal
          </LinkButton>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Reportar problema
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Completa el formulario con todos los detalles del problema
          </p>
        </div>
        <NewTicketForm
          categories={categories}
          subcategories={subcategories}
          profile={profile}
        />
    </main>
  )
}
