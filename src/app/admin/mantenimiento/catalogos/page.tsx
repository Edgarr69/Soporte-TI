export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CatalogsView } from '@/components/mantenimiento/catalogs-view'

export default async function CatalogosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const [
    { data: areas },
    { data: generalCats },
    { data: maqCats },
    { data: departments },
    { data: managers },
  ] = await Promise.all([
    supabase.from('areas').select('id, name, is_active, sort_order').order('sort_order'),
    supabase.from('maintenance_categories').select('id, name, type, is_active').eq('type', 'general').order('sort_order'),
    supabase.from('maintenance_categories').select('id, name, type, is_active').eq('type', 'maquinaria').order('sort_order'),
    supabase.from('departments').select('id, name, allowed_ticket_types').order('name'),
    supabase.from('department_managers').select('id, department_id, manager_name, is_default').eq('is_default', true),
  ])

  return (
    <CatalogsView
      areas={areas ?? []}
      generalCats={generalCats ?? []}
      maqCats={maqCats ?? []}
      departments={departments ?? []}
      managers={managers ?? []}
    />
  )
}
