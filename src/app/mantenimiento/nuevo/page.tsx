export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MaintenanceForm } from '@/components/mantenimiento/maintenance-form'
import { LinkButton } from '@/components/ui/link-button'
import { ChevronLeft } from 'lucide-react'
import type { MaintenanceType } from '@/lib/types'

export default async function NuevoMantenimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const params = await searchParams
  const tipo = (params.tipo ?? 'general') as MaintenanceType
  if (tipo !== 'general' && tipo !== 'maquinaria') notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, department:departments(id, name)')
    .eq('id', user.id)
    .single()

  if (!profile?.first_login_completed) redirect('/completar-perfil')

  const [{ data: departments }, { data: areas }, { data: categories }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase.from('areas').select('id, name').eq('is_active', true).order('sort_order'),
    supabase
      .from('maintenance_categories')
      .select('id, name')
      .eq('type', tipo)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const dept = profile?.department as { id: string; name: string } | null

  const tipoLabel = tipo === 'general' ? 'Mantenimiento General' : 'Mantenimiento de Maquinaria'

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <div className="mb-6 space-y-1">
          <LinkButton href="/mis-tickets?tab=general" variant="ghost" size="sm" className="-ml-2 mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Mis tickets
          </LinkButton>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Nueva solicitud
          </h1>
          <p className="text-sm text-zinc-500">{tipoLabel}</p>
        </div>

        <MaintenanceForm
          tipo={tipo}
          profile={{
            department_id:   dept?.id ?? null,
            department_name: dept?.name ?? null,
            area_id:         null,
            area_name:       null,
            encargado_nombre: profile?.encargado_nombre ?? null,
          }}
          departments={departments ?? []}
          areas={areas ?? []}
          categories={categories ?? []}
        />
    </main>
  )
}
