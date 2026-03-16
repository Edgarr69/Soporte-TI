'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { AdminNotification } from '@/lib/types'

function targetHref(n: AdminNotification): string | null {
  if (!n.target_id) return null
  if (n.target_type === 'ticket')             return `/admin/sistemas/tickets/${n.target_id}`
  if (n.target_type === 'maintenance_ticket') return `/admin/mantenimiento/tickets/${n.target_id}`
  return null
}

interface Props {
  notification: AdminNotification
}

export function AdminNotificationCard({ notification: n }: Props) {
  const href = targetHref(n)
  const date = format(new Date(n.created_at), "d/M/yyyy, HH:mm:ss", { locale: es })

  const inner = (
    <div
      className={cn(
        'rounded-xl bg-white dark:bg-zinc-900 px-5 py-4',
        'shadow-sm hover:shadow-md transition-shadow duration-150',
        href && 'cursor-pointer',
      )}
    >
      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
        {n.title}
      </p>

      {n.message && (
        <p className={cn(
          'text-sm mt-1 leading-snug',
          href
            ? 'text-blue-500 dark:text-blue-400'
            : 'text-zinc-500 dark:text-zinc-400',
        )}>
          {n.message}
        </p>
      )}

      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{date}</p>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
