'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, CheckCircle2, RotateCcw } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ChatThread } from '@/components/shared/chat-thread'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  type TicketStatus, type Priority,
} from '@/lib/types'
import { formatDateTime, formatRelative, minutesToHuman, cn } from '@/lib/utils'
import { addComment } from '@/actions/tickets'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BLOCKING_LABELS: Record<string, string> = {
  total:   'Sí, totalmente',
  partial: 'Sí, parcialmente',
  none:    'No',
}
const SCOPE_LABELS: Record<string, string> = {
  single:   'Solo a mí',
  multiple: 'A varias personas',
}

interface Comment {
  id: string
  body: string
  created_at: string
  author_id: string | null
  author: { full_name: string; email: string } | null
}

interface Props {
  ticket: Record<string, unknown>
  history: Record<string, unknown>[]
  comments: Comment[]
  currentUserId: string
  currentUserName: string
}

export function TicketDetail({ ticket, history, comments, currentUserId, currentUserName }: Props) {
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

  const [commentBody, setCommentBody]     = useState('')
  const [submitting,  setSubmitting]      = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  useEffect(() => { setLocalComments(comments) }, [comments])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`ticket-comments-${t.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_comments',
        filter: `ticket_id=eq.${t.id}`,
      }, async (payload) => {
        const row = payload.new as { id: string; author_id: string | null; is_internal: boolean }
        if (row.author_id === currentUserId || row.is_internal) return
        const { data } = await supabase
          .from('ticket_comments')
          .select('id, body, created_at, author_id, author:profiles(full_name, email)')
          .eq('id', row.id)
          .single()
        if (!data) return
        const author = Array.isArray(data.author) ? data.author[0] : data.author
        setLocalComments((prev) => {
          if (prev.some((c) => c.id === data.id)) return prev
          return [...prev, { ...data, author }]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [t.id, currentUserId])

  async function submitComment() {
    const body = commentBody.trim()
    if (!body) return
    setSubmitting(true)
    setCommentBody('')

    const tempId = `temp-${Date.now()}`
    const optimistic: Comment = {
      id:         tempId,
      body,
      created_at: new Date().toISOString(),
      author_id:  currentUserId,
      author:     { full_name: currentUserName, email: '' },
    }
    setLocalComments((prev) => [...prev, optimistic])

    const r = await addComment(t.id, body)
    setSubmitting(false)
    if (r?.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentBody(body)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <LinkButton href="/mis-tickets" variant="ghost" size="icon" className="-ml-2" aria-label="Volver a mis tickets">
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

      {/* Layout: chat izquierda, info derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Chat ── */}
        <div className="order-2 lg:order-1 lg:col-span-2 lg:sticky lg:top-6">
          <ChatThread
            messages={localComments}
            currentUserId={currentUserId}
            value={commentBody}
            onChange={setCommentBody}
            onSubmit={submitComment}
            submitting={submitting}
            className="h-[calc(100vh-14rem)]"
          />
        </div>

        {/* ── Info + Historial ── */}
        <div className="order-1 lg:order-2 lg:col-span-3 space-y-4">

          {/* Descripción */}
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
                <InfoItem label="Impide trabajar" value={BLOCKING_LABELS[t.blocking_level] ?? t.blocking_level} />
                <InfoItem label="Afecta a"        value={SCOPE_LABELS[t.affected_scope] ?? t.affected_scope} />
                <InfoItem label="Alternativa"     value={t.has_workaround ? 'Sí tiene' : 'No tiene'} />
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fechas y tiempos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <DateItem icon={<Calendar className="h-3.5 w-3.5" />}     label="Creado"           value={formatDateTime(t.created_at)} />
                <DateItem icon={<Clock className="h-3.5 w-3.5" />}        label="Primera atención" value={t.first_response_at ? formatDateTime(t.first_response_at) : '—'} />
                <DateItem icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resuelto"         value={t.resolved_at ? formatDateTime(t.resolved_at) : '—'} />
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

          {/* Solución */}
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
                  <div key={entry.id} className="relative mb-4 pl-4 last:mb-0">
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
      </div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function DateItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
