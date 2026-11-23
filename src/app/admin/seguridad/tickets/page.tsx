export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminSeguridadList } from '@/components/seguridad/admin-seguridad-list'
import { getAuthedProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NIVELES_RIESGO, type NivelRiesgo } from '@/lib/types'

const PAGE_SIZE = 30
const STATUSES = ['pendiente', 'en_revision', 'en_proceso', 'terminado', 'cancelado']

export default async function AdminSeguridadTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; riesgo?: string; page?: string }>
}) {
  const params = await searchParams
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_seguridad', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const page = Math.max(1, Number(params.page) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Rol ya validado — cliente de servicio para no depender de la RLS
  // de profiles en el join con el solicitante
  let query = createAdminClient()
    .from('seguridad_tickets')
    .select(`
      id, folio, status, nivel_riesgo, category_name_snapshot,
      department_name_snapshot, area_name_snapshot, ubicacion,
      created_at, updated_at,
      user:profiles!user_id(full_name, email)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.status === 'abiertos') query = query.in('status', ['pendiente', 'en_revision', 'en_proceso'])
  else if (params.status && STATUSES.includes(params.status)) query = query.eq('status', params.status)
  if (params.riesgo && NIVELES_RIESGO.includes(params.riesgo as NivelRiesgo)) query = query.eq('nivel_riesgo', params.riesgo)

  const { data: tickets, count } = await query

  return (
    <AdminSeguridadList
      tickets={(tickets ?? []) as unknown as Parameters<typeof AdminSeguridadList>[0]['tickets']}
      currentFilters={{ status: params.status, riesgo: params.riesgo }}
      page={page}
      totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
      totalCount={count ?? 0}
    />
  )
}
