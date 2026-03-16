import { createBrowserClient } from '@supabase/ssr'

// Fallback para que el build de Next.js no falle si las env vars no están configuradas.
// En runtime deben estar definidas en .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
