'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'

type Res = { error?: string; success?: boolean }

const ALLOWED_ROLES = ['admin_mantenimiento', 'super_admin']

async function checkAdminRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) return false
  return true
}

function validateName(name: string): { error: string } | null {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'El nombre no puede estar vacío' }
  if (trimmed.length > 255) return { error: 'El nombre es demasiado largo (máx. 255 caracteres)' }
  return null
}

// ─── Áreas ────────────────────────────────────────────────

export async function createArea(name: string): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

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

export async function updateArea(id: string, name: string, is_active: boolean): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

  const { error } = await supabase.from('areas').update({ name: name.trim(), is_active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  revalidateTag('areas', {})
  return { success: true }
}

export async function deleteArea(id: string): Promise<Res> {
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

export async function createMaintenanceCategory(name: string, type: 'general' | 'maquinaria'): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

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

export async function updateMaintenanceCategory(id: string, name: string, is_active: boolean): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

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

export async function setDepartmentManager(department_id: string, manager_name: string): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const trimmedName = manager_name.trim()
  if (!trimmedName) return { error: 'El nombre del encargado no puede estar vacío' }
  if (trimmedName.length > 255) return { error: 'El nombre es demasiado largo (máx. 255 caracteres)' }

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

// ─── Subcategorías de maquinaria ──────────────────────────

export async function createMachineSubcategory(categoryId: string, name: string): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

  const { data: last } = await supabase
    .from('machine_subcategories')
    .select('sort_order')
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from('machine_subcategories')
    .insert({ category_id: categoryId, name: name.trim(), sort_order })
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  return { success: true }
}

export async function updateMachineSubcategory(id: string, name: string, is_active: boolean): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }
  const nameErr = validateName(name); if (nameErr) return nameErr

  const { error } = await supabase
    .from('machine_subcategories')
    .update({ name: name.trim(), is_active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  return { success: true }
}

export async function deleteMachineSubcategory(id: string): Promise<Res> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  const { error } = await supabase.from('machine_subcategories').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  return { success: true }
}

// ─── Restricciones de ticket por departamento ─────────────

export async function setDepartmentAllowedTypes(
  departmentId: string,
  allowedTypes: ('general' | 'maquinaria')[],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }
  if (!(await checkAdminRole(supabase, user.id))) return { error: 'Sin permiso' }

  // 'general' siempre debe estar incluido
  const types = allowedTypes.includes('general') ? allowedTypes : ['general', ...allowedTypes]

  const { error } = await supabase
    .from('departments')
    .update({ allowed_ticket_types: types })
    .eq('id', departmentId)

  if (error) return { error: error.message }
  revalidatePath('/admin/mantenimiento/catalogos')
  return { success: true }
}
