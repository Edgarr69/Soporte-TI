export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { SeguridadCatalogsView } from '@/components/seguridad/seguridad-catalogs-view'
import { getAuthedProfile } from '@/lib/auth'

export default async function SeguridadCatalogosPage() {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')
  if (!profile || !['admin_seguridad', 'super_admin'].includes(profile.role)) redirect('/dashboard')

  const { data: categories } = await supabase
    .from('seguridad_categories')
    .select('id, name, is_active, sort_order')
    .order('sort_order')

  return <SeguridadCatalogsView categories={categories ?? []} />
}
