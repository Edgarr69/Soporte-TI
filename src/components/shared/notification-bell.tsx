'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, ExternalLink } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { Notification, AdminNotification, Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { NotifDetailModal, toNotifItem, toAdminNotifItem, type NotifItem } from './notif-detail-modal'

const ADMIN_ROLES: Role[] = ['admin_sistemas', 'admin_mantenimiento', 'super_admin']

interface Props {
  unreadCount: number
  userId: string
  role: Role
}

export function NotificationBell({ unreadCount: initialCount, userId, role }: Props) {
  const supabase = createClient()
  const isAdmin  = ADMIN_ROLES.includes(role)

  const [count, setCount]         = useState(initialCount)
  const [items, setItems]         = useState<NotifItem[]>([])
  const [open, setOpen]           = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const [selected, setSelected]   = useState<NotifItem | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => { setCount(initialCount) }, [initialCount])

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen || loaded) return

    if (isAdmin) {
      const { data, error } = await supabase
        .rpc('get_admin_notifications_for_user', { p_limit: 20, p_offset: 0 })
      if (error) console.error('[NotificationBell] RPC error:', error)
      setItems((data ?? []).map((n: AdminNotification) => toAdminNotifItem(n)))
    } else {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      setItems((data ?? []).map((n: Notification) => toNotifItem(n)))
    }
    setLoaded(true)
  }

  async function openDetail(item: NotifItem) {
    setOpen(false)
    setSelected(item)
    if (!item.is_read) {
      if (isAdmin) {
        await supabase.rpc('mark_admin_notification_read', { p_notification_id: item.id })
      } else {
        await supabase.from('notifications').update({ is_read: true }).eq('id', item.id)
      }
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n))
      setCount((c) => Math.max(0, c - 1))
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    if (isAdmin) {
      await supabase.rpc('mark_all_admin_notifications_read')
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    }
    setMarkingAll(false)
    setCount(0)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const footerHref  = isAdmin ? '/admin/historial' : '/notificaciones'
  const footerLabel = isAdmin ? 'Ver historial completo' : 'Ver todas las notificaciones'

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpen}>
        <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')}>
          <Bell className="h-6 w-6" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-96 p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isAdmin ? 'Actividad reciente' : 'Notificaciones'}
            </span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingAll ? 'Marcando…' : 'Marcar todas como leídas'}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Sin notificaciones</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openDetail(n)}
                  className={cn(
                    'w-full text-left rounded-xl px-4 py-3 transition-all hover:shadow-md cursor-pointer',
                    n.is_read
                      ? 'bg-zinc-50 dark:bg-zinc-800/50'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className={cn('min-w-0 flex-1', n.is_read && 'pl-4')}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug truncate">
                          {n.title}
                        </p>
                        <ExternalLink size={12} className="flex-shrink-0 text-zinc-300 dark:text-zinc-600" />
                      </div>
                      {n.body && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {format(new Date(n.created_at), "d MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5">
            <Link
              href={footerHref}
              className="block text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {footerLabel}
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {selected && (
        <NotifDetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
