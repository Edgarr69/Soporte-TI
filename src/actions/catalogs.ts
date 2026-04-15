'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

const ALLOWED_ROLES = ['admin_mantenimiento', 'super_admin']

async function checkAdminRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return false
  return true
}

// ─── Áreas ────────────────────────────────────────────────

export async function createArea(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  // Get next sort_order
  const { data: last } = await supabase
    .from('areas').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { error } = await supabase.from('areas').insert({ name: name.trim(), sort_order })
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('areas', {})
  return { success: true }
}

export async function updateArea(id: string, name: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const { error } = await supabase.from('areas').update({ name: name.trim(), is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('areas', {})
  return { success: true }
}

export async function deleteArea(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const { error } = await supabase.from('areas').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('areas', {})
  return { success: true }
}

// ─── Categorías de mantenimiento ─────────────────────────

export async function createMaintenanceCategory(name: string, type: 'general' | 'maquinaria') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const { data: last } = await supabase
    .from('maintenance_categories')
    .select('sort_order')
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { error } = await supabase.from('maintenance_categories').insert({
    name: name.trim(), type, sort_order,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('maintenance-categories', {})
  return { success: true }
}

export async function updateMaintenanceCategory(id: string, name: string, is_active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const { error } = await supabase
    .from('maintenance_categories')
    .update({ name: name.trim(), is_active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('maintenance-categories', {})
  return { success: true }
}

// ─── Encargados de departamento ────────────────────────────

export async function setDepartmentManager(department_id: string, manager_name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const trimmedName = manager_name.trim()
  if (!trimmedName) return { error: 'El nombre del encargado no puede estar vacío' }

  // Upsert: si ya hay default, actualizarlo; si no, crear
  const { data: existing } = await supabase
    .from('department_managers')
    .select('id')
    .eq('department_id', department_id)
    .eq('is_default', true)
    .single()

  if (existing) {
    await supabase
      .from('department_managers')
      .update({ manager_name: trimmedName })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('department_managers')
      .insert({ department_id, manager_name: trimmedName, is_default: true })
  }

  revalidatePath('/admin/mantenimiento/catalogos')
  return { success: true }
}
