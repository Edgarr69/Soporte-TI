export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { SeguridadForm } from '@/components/seguridad/seguridad-form'
import { getCachedAreas, getCachedSeguridadCategories } from '@/lib/catalog-cache'
import { LinkButton } from '@/components/ui/link-button'
import { ChevronLeft } from 'lucide-react'
import { getAuthedProfile } from '@/lib/auth'

export default async function NuevoReporteSeguridadPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const dept = profile?.department as { id: string; name: string } | null

  const [areas, categories] = await Promise.all([
    getCachedAreas(),
    getCachedSeguridadCategories(),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="mb-6 space-y-1">
        <LinkButton href="/mis-tickets?tab=seguridad" variant="ghost" size="sm" className="-ml-2 mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Mis tickets
        </LinkButton>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nuevo reporte
        </h1>
        <p className="text-sm text-zinc-500">Seguridad e Higiene</p>
      </div>

      <SeguridadForm
        departmentName={dept?.name ?? null}
        areas={areas}
        categories={categories}
      />
    </main>
  )
}
