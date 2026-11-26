import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

type Handler = (payload: Record<string, unknown>) => void

// Un solo canal por tópico aunque varios componentes escuchen lo mismo
// (ej. la campana y la página de notificaciones montadas a la vez):
// supabase-js reutiliza el canal por nombre, así que sin este registro
// el primer componente en desmontarse cerraría el canal del otro.
const registry = new Map<string, { channel: RealtimeChannel; handlers: Set<Handler> }>()

/**
 * Escucha avisos Broadcast `insert` de un tópico (los manda la base con
 * realtime.send, migración 020). Devuelve la función de limpieza para
 * usarla directo como retorno de useEffect.
 */
export function onBroadcast(supabase: SupabaseClient, topic: string, handler: Handler): () => void {
  let entry = registry.get(topic)
  if (!entry) {
    const handlers = new Set<Handler>()
    const channel = supabase
      .channel(topic)
      .on('broadcast', { event: 'insert' }, ({ payload }) => {
        handlers.forEach((h) => h(payload as Record<string, unknown>))
      })
    channel.subscribe()
    entry = { channel, handlers }
    registry.set(topic, entry)
  }
  const current = entry
  current.handlers.add(handler)
  return () => {
    current.handlers.delete(handler)
    if (current.handlers.size === 0) {
      supabase.removeChannel(current.channel)
      registry.delete(topic)
    }
  }
}
