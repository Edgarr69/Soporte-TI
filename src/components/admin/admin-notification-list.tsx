'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { markAllAdminNotificationsRead, markOneAdminNotificationRead } from '@/actions/admin-notifications'
import { NotifDetailModal, toAdminNotifItem, type NotifItem } from '@/components/shared/notif-detail-modal'
import type { AdminNotification, AdminNotificationModule, AdminNotificationType, Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Inferencia de módulo ─────────────────────────────────

const MAINTENANCE_TYPES: AdminNotificationType[] = [
  'maintenance_created', 'maintenance_status_changed',
  'maintenance_assigned', 'maintenance_closed', 'maintenance_cancelled',
]
const SISTEMAS_TYPES: AdminNotificationType[] = [
  'ticket_created', 'ticket_status_changed', 'ticket_closed', 'ticket_reopened',
]

function effectiveModule(n: AdminNotification): AdminNotificationModule {
  if (n.module) return n.module
  if (MAINTENANCE_TYPES.includes(n.type)) return 'mantenimiento'
  if (SISTEMAS_TYPES.includes(n.type))    return 'sistemas'
  return 'global'
}

// ─── Filtros: solo super_admin tiene "Todos" y todos los tabs ─

const SUPER_FILTERS: { value: AdminNotificationModule | 'all'; label: string }[] = [
  { value: 'all',           label: 'Todos'         },
  { value: 'sistemas',      label: 'Sistemas'       },
  { value: 'mantenimiento', label: 'Mantenimiento'  },
  { value: 'global',        label: 'Global'         },
]

// ─── Card de notificación ─────────────────────────────────

const MODULE_DOT: Record<string, string> = {
  sistemas:      'bg-blue-500',
  mantenimiento: 'bg-amber-500',
  global:        'bg-violet-500',
}

function NotifCard({
  n,
  onClick,
}: {
  n: AdminNotification
  onClick: () => void
}) {
  const mod  = effectiveModule(n)
  const date = format(new Date(n.created_at), "d MMM yyyy, HH:mm", { locale: es })

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl px-5 py-4 transition-all hover:shadow-md',
        n.is_read
          ? 'bg-white dark:bg-zinc-900 shadow-sm'
          : 'bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Indicador no leído */}
        <span className={cn(
          'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
          n.is_read ? 'bg-transparent' : (MODULE_DOT[mod] ?? 'bg-zinc-400'),
        )} />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
            {n.title}
          </p>
          {n.message && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
              {n.message}
            </p>
          )}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{date}</p>
        </div>
      </div>
    </button>
  )
}

// ─── Lista principal ──────────────────────────────────────

interface Props {
  notifications: AdminNotification[]
  role: Role
}

export function AdminNotificationList({ notifications: initial, role }: Props) {
  const router = useRouter()
  const isSuperAdmin = role === 'super_admin'

  const [items, setItems]           = useState(initial)
  const [filter, setFilter]         = useState<AdminNotificationModule | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selected, setSelected]     = useState<NotifItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => items.filter((n) => {
    if (filter !== 'all' && effectiveModule(n) !== filter) return false
    if (unreadOnly && n.is_read) return false
    return true
  }), [items, filter, unreadOnly])

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items])

  async function openDetail(n: AdminNotification) {
    const item = toAdminNotifItem(n)
    setSelected(item)

    if (!n.is_read) {
      await markOneAdminNotificationRead(n.id)
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      router.refresh()
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAdminNotificationsRead()
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
      router.refresh()
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tabs de filtro: solo super_admin */}
          {isSuperAdmin && SUPER_FILTERS.map((f) => (
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

        <p className="text-xs text-zinc-400">{filtered.length} de {items.length} eventos</p>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 py-16 flex flex-col items-center gap-2 text-zinc-400">
            <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
            <p className="text-sm">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {filtered.map((n) => (
              <NotifCard key={n.id} n={n} onClick={() => openDetail(n)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <NotifDetailModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
