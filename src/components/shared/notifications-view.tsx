'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Check, ExternalLink } from 'lucide-react'
import type { Notification, Role } from '@/lib/types'
import { formatRelative, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { NotifDetailModal, toNotifItem, type NotifItem } from '@/components/shared/notif-detail-modal'

interface Props {
  initialNotifications: Notification[]
  userId: string
  role: Role
}

export function NotificationsView({ initialNotifications, userId, role }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [selected, setSelected] = useState<NotifItem | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  // Tiempo real — misma estrategia que el chat de tickets (canal + postgres_changes).
  // Replica el filtro por módulo de la página (admin_sistemas/admin_mantenimiento
  // solo ven lo suyo) ya que `postgres_changes` no soporta esa lógica condicional
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-page-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const row = payload.new as Notification
        if (role === 'admin_sistemas'      && row.module !== 'sistemas')      return
        if (role === 'admin_mantenimiento' && row.module !== 'mantenimiento') return
        setNotifications((prev) => prev.some((n) => n.id === row.id) ? prev : [row, ...prev])
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, role, supabase, router])

  async function markAllRead() {
    setMarkingAll(true)
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setMarkingAll(false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toast.success('Todas marcadas como leídas.')
    router.refresh()
  }

  async function openDetail(n: Notification) {
    setSelected(toNotifItem(n))
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      router.refresh()
    }
  }

  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <>
      <div className="space-y-3">
        {hasUnread && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={markingAll}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {markingAll ? 'Marcando…' : 'Marcar todas como leídas'}
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
            <CardContent className="py-16 text-center">
              <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Sin notificaciones</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card
              key={n.id}
              onClick={() => openDetail(n)}
              className={cn(
                'border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700',
                !n.is_read && 'border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20'
              )}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className={cn('flex-1 min-w-0', n.is_read && 'pl-5')}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-zinc-400">{formatRelative(n.created_at)}</span>
                        <ExternalLink size={11} className="text-zinc-300 dark:text-zinc-600" />
                      </div>
                    </div>
                    {n.body && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selected && (
        <NotifDetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
