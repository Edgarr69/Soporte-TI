export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { TecnicosView } from '@/components/mantenimiento/tecnicos-view'
import { getCachedTechnicians } from '@/lib/catalog-cache'
import { getAuthedProfile } from '@/lib/auth'

export default async function TecnicosPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const tecnicos = await getCachedTechnicians()

  return (
    <TecnicosView
      tecnicos={tecnicos as { id: string; email: string; full_name: string | null; created_at: string }[]}
    />
  )
}
