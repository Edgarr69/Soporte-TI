'use client'

import { useState, useTransition } from 'react'
import { Bell } from 'lucide-react'
import { AdminNotificationCard } from './admin-notification-card'
import { markAllAdminNotificationsRead } from '@/actions/admin-notifications'
import type { AdminNotification, AdminNotificationModule } from '@/lib/types'
import { cn } from '@/lib/utils'

const FILTERS: { value: AdminNotificationModule | 'all'; label: string }[] = [
  { value: 'all',           label: 'Todos'         },
  { value: 'sistemas',      label: 'Sistemas'       },
  { value: 'mantenimiento', label: 'Mantenimiento'  },
  { value: 'global',        label: 'Global'         },
]

interface Props {
  notifications: AdminNotification[]
}

export function AdminNotificationList({ notifications }: Props) {
  const [filter, setFilter]         = useState<AdminNotificationModule | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = notifications.filter((n) => {
    if (filter !== 'all' && n.module !== filter) return false
    if (unreadOnly && n.is_read) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  function handleMarkAllRead() {
    startTransition(async () => { await markAllAdminNotificationsRead() })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              filter === f.value
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
            )}
          >
            {f.label}
          </button>
        ))}

        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium transition-colors',
            unreadOnly
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700',
          )}
        >
          Sin leer{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </button>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline underline-offset-2 transition-colors disabled:opacity-50"
          >
            Marcar todo leído
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400">{filtered.length} de {notifications.length} eventos</p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-16 flex flex-col items-center gap-2 text-zinc-400">
          <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
          <p className="text-sm">Sin actividad registrada</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
          {filtered.map((n) => (
            <AdminNotificationCard key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  )
}
