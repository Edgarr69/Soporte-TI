import { Badge } from '@/components/ui/badge'
import { cn, formatRelative } from '@/lib/utils'

interface HistoryEntry {
  id: string
  to_status: string
  from_status: string | null
  comment: string | null
  created_at: string
  changer?: { full_name?: string | null; email?: string | null } | null
}

interface Props {
  entries: HistoryEntry[]
  statusLabels: Record<string, string>
  statusColors: Record<string, string>
}

export function HistorialTimeline({ entries, statusLabels, statusColors }: Props) {
  if (!entries.length) {
    return <p className="text-sm text-zinc-400 py-4 text-center">Sin historial aún.</p>
  }

  return (
    <div className="relative pl-4">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
      {entries.map((entry) => (
        <div key={entry.id} className="relative mb-4 pl-4">
          <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('text-xs', statusColors[entry.to_status] ?? 'bg-zinc-100 text-zinc-700')}>
                  {statusLabels[entry.to_status] ?? entry.to_status}
                </Badge>
                {entry.from_status && (
                  <span className="text-xs text-zinc-400">
                    desde {statusLabels[entry.from_status] ?? entry.from_status}
                  </span>
                )}
              </div>
              {entry.comment && (
                <p className="text-xs text-zinc-500 mt-0.5">{entry.comment}</p>
              )}
              <p className="text-xs text-zinc-400 mt-0.5">
                {entry.changer?.full_name ?? entry.changer?.email ?? 'Sistema'}
              </p>
            </div>
            <span className="text-xs text-zinc-400 flex-shrink-0 whitespace-nowrap">
              {formatRelative(entry.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
