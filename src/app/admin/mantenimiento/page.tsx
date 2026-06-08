export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { AdminMantenimientoDashboard } from '@/components/mantenimiento/admin-mant-dashboard'
import { getCachedAllMaintenanceTickets } from '@/lib/admin-dashboard-cache'
import { getAuthedProfile } from '@/lib/auth'

export default async function AdminMantenimientoPage() {
  const { user, profile } = await getAuthedProfile()
  if (!user) redirect('/login')

  if (!profile || !['admin_mantenimiento', 'super_admin'].includes(profile.role))
    redirect('/dashboard')

  const all = await getCachedAllMaintenanceTickets()

  return <AdminMantenimientoDashboard tickets={all} />
}
