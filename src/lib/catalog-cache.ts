import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
  )
}

export const getCachedTicketCategories = unstable_cache(
  async () => {
    const { data } = await getClient()
      .from('ticket_categories')
      .select('id, name, icon')
      .order('sort_order')
    return data ?? []
  },
  ['ticket-categories'],
  { revalidate: 3600, tags: ['ticket-categories'] },
)

export const getCachedTicketSubcategories = unstable_cache(
  async () => {
    const { data } = await getClient()
      .from('ticket_subcategories')
      .select('id, category_id, name, base_score')
      .order('sort_order')
    return data ?? []
  },
  ['ticket-subcategories'],
  { revalidate: 3600, tags: ['ticket-subcategories'] },
)

export const getCachedDepartments = unstable_cache(
  async () => {
    const { data } = await getClient()
      .from('departments')
      .select('id, name')
      .order('name')
    return data ?? []
  },
  ['departments'],
  { revalidate: 3600, tags: ['departments'] },
)

export const getCachedAreas = unstable_cache(
  async () => {
    const { data } = await getClient()
      .from('areas')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
    return data ?? []
  },
  ['areas'],
  { revalidate: 3600, tags: ['areas'] },
)

export const getCachedMaintenanceCategories = unstable_cache(
  async (tipo: string) => {
    const { data } = await getClient()
      .from('maintenance_categories')
      .select('id, name')
      .eq('type', tipo)
      .eq('is_active', true)
      .order('sort_order')
    return data ?? []
  },
  ['maintenance-categories'],
  { revalidate: 3600, tags: ['maintenance-categories'] },
)
