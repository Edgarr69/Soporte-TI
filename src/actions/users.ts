'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { Role } from '@/lib/types'
import { createAdminNotification } from '@/actions/admin-notifications'

// ─── Crear usuario (solo super_admin o admin_sistemas) ────

export async function createUser(data: {
  email: string
  password: string
  full_name?: string
  role: Role
  department_id?: string
  encargado_nombre?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const allowedRoles: Role[] = ['super_admin', 'admin_sistemas', 'admin_mantenimiento']
  if (!adminProfile || !allowedRoles.includes(adminProfile.role as Role))
    return { error: 'Sin permiso' }

  // Use service role client for admin operations
  const serviceUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceKey) return { error: 'Configuración de servidor incompleta' }

  const adminSupabase = createAdminClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create auth user
  const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
    email:     data.email,
    password:  data.password,
    email_confirm: true,
  })

  if (createErr || !newUser.user) return { error: createErr?.message ?? 'Error al crear usuario' }

  // Update profile (created by trigger) with role and optional preloaded data
  const profileUpdates: Record<string, unknown> = {
    role: data.role,
  }
  if (data.full_name)         profileUpdates.full_name         = data.full_name.trim()
  if (data.department_id)     profileUpdates.department_id     = data.department_id
  if (data.encargado_nombre)  profileUpdates.encargado_nombre  = data.encargado_nombre.trim()

  // If admin pre-loaded all required fields, mark first_login_completed
  if (data.full_name && data.department_id && data.encargado_nombre) {
    profileUpdates.first_login_completed = true
  }

  await adminSupabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', newUser.user.id)

  // Admin notification
  const { data: actorU } = await supabase
    .from('profiles').select('full_name, email').eq('id', user.id).single()
  const actorNameU  = actorU?.full_name ?? actorU?.email ?? 'Admin'
  const newUserName = data.full_name ?? data.email
  await createAdminNotification({
    title:      'Nuevo usuario registrado',
    message:    `${actorNameU} creó la cuenta de ${newUserName} con rol ${data.role}`,
    type:       'user_created',
    module:     'global',
    actorId:    user.id,
    actorName:  actorNameU,
    targetId:   newUser.user.id,
    targetType: 'user',
  })

  revalidatePath('/admin/usuarios')
  return { success: true, userId: newUser.user.id }
}

// ─── Actualizar rol de usuario ─────────────────────────────

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const isSuperAdmin = adminProfile?.role === 'super_admin'
  const isMantAdmin  = adminProfile?.role === 'admin_mantenimiento'

  if (!isSuperAdmin && !isMantAdmin)
    return { error: 'Sin permiso para cambiar roles' }

  // Nadie puede cambiar su propio rol
  if (targetUserId === user.id)
    return { error: 'No puedes cambiar tu propio rol' }

  if (isMantAdmin) {
    // Verificar que el target no sea admin_sistemas
    const { data: targetProfile } = await supabase
      .from('profiles').select('role').eq('id', targetUserId).single()
    if (targetProfile?.role === 'admin_sistemas')
      return { error: 'No puedes cambiar el rol de un administrador de sistemas' }

    const mantAllowedRoles: Role[] = ['usuario', 'tecnico_mantenimiento']
    if (!mantAllowedRoles.includes(newRole))
      return { error: 'Solo puedes asignar Usuario o Técnico de Mantenimiento' }
  }

  // Usar service role para saltarse RLS en profiles
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceKey) return { error: 'Configuración de servidor incompleta' }

  const adminSupabase = createAdminClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminSupabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  // Admin notification
  const [{ data: actorR }, { data: targetR }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('profiles').select('full_name, email').eq('id', targetUserId).single(),
  ])
  const actorNameR  = actorR?.full_name  ?? actorR?.email  ?? 'Admin'
  const targetNameR = targetR?.full_name ?? targetR?.email ?? targetUserId
  await createAdminNotification({
    title:      'Rol de usuario actualizado',
    message:    `${actorNameR} cambió el rol de ${targetNameR} a ${newRole}`,
    type:       'user_role_changed',
    module:     'global',
    actorId:    user.id,
    actorName:  actorNameR,
    targetId:   targetUserId,
    targetType: 'user',
  })

  revalidatePath('/admin/usuarios')
  return { success: true }
}

// ─── Eliminar usuario ──────────────────────────────────────

export async function deleteUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  const allowedRoles: Role[] = ['super_admin', 'admin_sistemas', 'admin_mantenimiento']
  if (!adminProfile || !allowedRoles.includes(adminProfile.role as Role))
    return { error: 'Sin permiso' }

  if (targetUserId === user.id) return { error: 'No puedes eliminarte a ti mismo' }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!serviceKey) return { error: 'Configuración de servidor incompleta' }

  const adminSupabase = createAdminClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminSupabase.auth.admin.deleteUser(targetUserId)
  if (error) return { error: error.message }

  revalidatePath('/admin/mantenimiento/tecnicos')
  revalidatePath('/admin/usuarios')
  return { success: true }
}
