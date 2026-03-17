'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, CheckCircle2, RotateCcw } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  type TicketStatus, type Priority,
} from '@/lib/types'
import { formatDateTime, formatRelative, minutesToHuman, cn } from '@/lib/utils'

interface Props {
  ticket: Record<string, unknown>
  history: Record<string, unknown>[]
  comments: Record<string, unknown>[]
}

export function TicketDetail({ ticket, history, comments }: Props) {
  const t = ticket as {
    id: string; folio: string; status: TicketStatus; priority: Priority
    description: string; is_reopened: boolean; reopen_count: number
    blocking_level: string; affected_scope: string; has_workaround: boolean
    created_at: string; first_response_at: string | null
    resolved_at: string | null; closed_at: string | null
    first_response_time_minutes: number | null; resolution_time_minutes: number | null
    visible_resolution_summary: string | null
    ticket_categories: { name: string } | null
    ticket_subcategories: { name: string } | null
  }

  const blockingMap: Record<string, string> = {
    total:   'Sí, totalmente',
    partial: 'Sí, parcialmente',
    none:    'No',
  }

  const scopeMap: Record<string, string> = {
    single:   'Solo a mí',
    multiple: 'A varias personas',
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <LinkButton href="/tickets" variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
            {t.is_reopened && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                <RotateCcw className="h-3 w-3 mr-1" />
                Reabierto {t.reopen_count}x
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            {t.ticket_categories?.name} — {t.ticket_subcategories?.name}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={cn('text-xs', STATUS_COLORS[t.status])}>
            {STATUS_LABELS[t.status]}
          </Badge>
          <Badge className={cn('text-xs', PRIORITY_COLORS[t.priority])}>
            {PRIORITY_LABELS[t.priority]}
          </Badge>
        </div>
      </div>

      {/* Información principal */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Descripción del problema</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {t.description}
          </p>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-400">Impide trabajar</p>
              <p className="font-medium">{blockingMap[t.blocking_level] ?? t.blocking_level}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Afecta a</p>
              <p className="font-medium">{scopeMap[t.affected_scope] ?? t.affected_scope}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Alternativa</p>
              <p className="font-medium">{t.has_workaround ? 'Sí tiene' : 'No tiene'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fechas y tiempos */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Fechas y tiempos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DateItem icon={<Calendar className="h-3.5 w-3.5" />} label="Creado" value={formatDateTime(t.created_at)} />
            <DateItem icon={<Clock className="h-3.5 w-3.5" />}    label="Primera atención" value={t.first_response_at ? formatDateTime(t.first_response_at) : '—'} />
            <DateItem icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resuelto" value={t.resolved_at ? formatDateTime(t.resolved_at) : '—'} />
          </div>
          {(t.first_response_time_minutes !== null || t.resolution_time_minutes !== null) && (
            <>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-400">Tiempo primera respuesta</p>
                  <p className="text-sm font-semibold">{minutesToHuman(t.first_response_time_minutes)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Tiempo de resolución</p>
                  <p className="text-sm font-semibold">{minutesToHuman(t.resolution_time_minutes)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolución visible para usuario */}
      {t.visible_resolution_summary && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800 dark:text-green-300">Solución aplicada</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-green-700 dark:text-green-400 whitespace-pre-wrap">
              {t.visible_resolution_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comentarios */}
      {comments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Comentarios del equipo de soporte
          </h2>
          {comments.map((c) => {
            const cm = c as {
              id: string; body: string; created_at: string
              author: { full_name: string; email: string } | null
            }
            return (
              <Card key={cm.id} className="border-zinc-200 dark:border-zinc-800">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {cm.author?.full_name ?? cm.author?.email ?? 'Soporte TI'}
                    </span>
                    <span className="text-xs text-zinc-400">{formatRelative(cm.created_at)}</span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{cm.body}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Historial */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Historial del ticket
        </h2>
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
          {history.map((h) => {
            const entry = h as {
              id: string; to_status: string; from_status: string | null
              comment: string | null; created_at: string
              changer: { full_name: string; email: string } | null
            }
            return (
              <div key={entry.id} className="relative mb-4 pl-4">
                <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950" />
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn('text-xs', STATUS_COLORS[entry.to_status as TicketStatus])}>
                        {STATUS_LABELS[entry.to_status as TicketStatus] ?? entry.to_status}
                      </Badge>
                      {entry.from_status && (
                        <span className="text-xs text-zinc-400">
                          desde {STATUS_LABELS[entry.from_status as TicketStatus] ?? entry.from_status}
                        </span>
                      )}
                    </div>
                    {entry.comment && (
                      <p className="text-xs text-zinc-500 mt-0.5">{entry.comment}</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {entry.changer?.full_name ?? 'Sistema'}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">{formatRelative(entry.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DateItem({
  icon, label, value,
}: {
  icon: React.ReactNode; label: string; value: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-zinc-400 mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
