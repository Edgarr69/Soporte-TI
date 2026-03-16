'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
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

const ADMIN_ROLES: Role[] = ['admin_sistemas', 'admin_mantenimiento', 'super_admin']

interface NotifItem {
  id: string
  title: string
  body: string | null
  created_at: string
  is_read: boolean
  href: string | null
}

function toItem(n: Notification): NotifItem {
  return {
    id:         n.id,
    title:      n.title,
    body:       n.body,
    created_at: n.created_at,
    is_read:    n.is_read,
    href:       n.ticket_id ? `/tickets/${n.ticket_id}` : null,
  }
}

function toAdminItem(n: AdminNotification): NotifItem {
  let href: string | null = null
  if (n.target_type === 'ticket')             href = `/admin/sistemas/tickets/${n.target_id}`
  if (n.target_type === 'maintenance_ticket') href = `/admin/mantenimiento/tickets/${n.target_id}`
  return {
    id:         n.id,
    title:      n.title,
    body:       n.message,
    created_at: n.created_at,
    is_read:    n.is_read,
    href,
  }
}

interface Props {
  unreadCount: number
  userId: string
  role: Role
}

export function NotificationBell({ unreadCount: initialCount, userId, role }: Props) {
  const supabase  = createClient()
  const isAdmin   = ADMIN_ROLES.includes(role)
  const [count, setCount]    = useState(initialCount)
  const [items, setItems]    = useState<NotifItem[]>([])
  const [open, setOpen]      = useState(false)
  const [loaded, setLoaded]  = useState(false)

  async function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen || loaded) return

    if (isAdmin) {
      const { data, error } = await supabase
        .rpc('get_admin_notifications_for_user', { p_limit: 20, p_offset: 0 })
      if (error) console.error('[NotificationBell] RPC error:', error)
      console.log('[NotificationBell] data:', data)
      setItems((data ?? []).map((n: AdminNotification) => toAdminItem(n)))
    } else {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      setItems((data ?? []).map((n: Notification) => toItem(n)))
    }

    setLoaded(true)
  }

  async function markAllRead() {
    if (isAdmin) {
      await supabase.rpc('mark_all_admin_notifications_read')
    } else {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
    }
    setCount(0)
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const footerHref  = isAdmin ? '/admin/historial' : '/notificaciones'
  const footerLabel = isAdmin ? 'Ver historial completo' : 'Ver todas las notificaciones'

  return (
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {isAdmin ? 'Actividad reciente' : 'Notificaciones'}
          </span>
          {count > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">Sin notificaciones</p>
          ) : (
            items.map((n) => {
              const card = (
                <div
                  key={n.id}
                  className={cn(
                    'rounded-xl px-5 py-4 shadow-sm transition-shadow hover:shadow-md',
                    n.is_read
                      ? 'bg-white dark:bg-zinc-900'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700',
                    n.href && 'cursor-pointer',
                  )}
                >
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {format(new Date(n.created_at), "d/M/yyyy, HH:mm:ss", { locale: es })}
                  </p>
                </div>
              )

              return n.href
                ? <Link key={n.id} href={n.href}>{card}</Link>
                : <div key={n.id}>{card}</div>
            })
          )}
        </div>

        {/* Footer */}
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
  )
}
