'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  changeTicketStatus,
  updateTicketResolution,
  addComment,
} from '@/actions/tickets'
import {
  ArrowLeft, Loader2, RotateCcw, MessageSquare, Lock, Calendar, Clock, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  TICKET_TRANSITIONS,
  type TicketStatus, type Priority,
} from '@/lib/types'
import { formatDateTime, formatRelative, minutesToHuman, cn } from '@/lib/utils'
import { toast } from 'sonner'


interface Props {
  ticket: Record<string, unknown>
  history: Record<string, unknown>[]
  comments: Record<string, unknown>[]
}

export function AdminTicketDetail({ ticket: initialTicket, history, comments: initialComments }: Props) {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()

  const t = initialTicket as {
    id: string; folio: string; status: TicketStatus; priority: Priority
    description: string; is_reopened: boolean; reopen_count: number
    blocking_level: string; affected_scope: string; has_workaround: boolean
    created_at: string; first_response_at: string | null
    resolved_at: string | null; closed_at: string | null; reopened_at: string | null
    first_response_time_minutes: number | null; resolution_time_minutes: number | null
    resolution_summary: string | null
    visible_resolution_summary: string | null
    technical_notes: string | null
    ticket_categories: { name: string } | null
    ticket_subcategories: { name: string } | null
    user: { id: string; full_name: string; email: string } | null
    department: { name: string } | null
  }

  const [newStatus,     setNewStatus]     = useState<TicketStatus | ''>('')
  const [statusComment, setStatusComment] = useState('')
  const [commentBody,   setCommentBody]   = useState('')
  const [isInternal,    setIsInternal]    = useState(false)
  const [resSummary,    setResSummary]    = useState(t.resolution_summary ?? '')
  const [visibleRes,    setVisibleRes]    = useState(t.visible_resolution_summary ?? '')
  const [techNotes,     setTechNotes]     = useState(t.technical_notes ?? '')
  const [comments,      setComments]      = useState(initialComments)

  const allowedStatuses = TICKET_TRANSITIONS[t.status] ?? []

  const blockingMap: Record<string, string> = {
    total: 'Sí, totalmente', partial: 'Sí, parcialmente', none: 'No',
  }
  const scopeMap: Record<string, string> = {
    single: 'Solo a mí', multiple: 'A varias personas',
  }

  function handleChangeStatus() {
    if (!newStatus) return
    startTransition(async () => {
      const res = await changeTicketStatus(t.id, newStatus as TicketStatus, statusComment || undefined)
      if (res.error) { toast.error(res.error); return }
      toast.success(`Estado cambiado a "${STATUS_LABELS[newStatus as TicketStatus]}"`)
      setNewStatus(''); setStatusComment('')
      router.refresh()
    })
  }

  function handleSaveResolution() {
    startTransition(async () => {
      const res = await updateTicketResolution(t.id, {
        resolution_summary:         resSummary,
        visible_resolution_summary: visibleRes,
        technical_notes:            techNotes,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Información guardada.')
    })
  }

  function handleAddComment() {
    if (!commentBody.trim()) return
    startTransition(async () => {
      const res = await addComment(t.id, commentBody.trim(), isInternal)
      if (res.error) { toast.error(res.error); return }
      toast.success('Comentario agregado.')
      setCommentBody('')
      setComments((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          body: commentBody.trim(),
          is_internal: isInternal,
          created_at: new Date().toISOString(),
          author: { full_name: 'Sistemas TI', email: '' },
        } as Record<string, unknown>,
      ])
    })
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <LinkButton href="/admin/sistemas/tickets" variant="ghost" size="icon" className="-ml-2 mt-0.5">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
            {t.is_reopened && (
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                <RotateCcw className="h-3 w-3 mr-1" />Reabierto {t.reopen_count}x
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            {t.ticket_categories?.name} — {t.ticket_subcategories?.name}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {t.user?.full_name} · {t.department?.name ?? 'Sin depto.'}
          </p>
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

      <Tabs defaultValue="ticket" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="ticket">Ticket</TabsTrigger>
          <TabsTrigger value="gestion">Gestión</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        {/* ─── Tab: Ticket ─── */}
        <TabsContent value="ticket" className="space-y-4">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Descripción</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {t.description}
              </p>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-zinc-400">Impide trabajar</p>
                  <p className="font-medium">{blockingMap[t.blocking_level]}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Afecta a</p>
                  <p className="font-medium">{scopeMap[t.affected_scope]}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Alternativa</p>
                  <p className="font-medium">{t.has_workaround ? 'Sí' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Fechas y tiempos</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <DateItem label="Creado"           value={formatDateTime(t.created_at)} />
                <DateItem label="Primera atención" value={t.first_response_at ? formatDateTime(t.first_response_at) : '—'} />
                <DateItem label="Resuelto"         value={t.resolved_at ? formatDateTime(t.resolved_at) : '—'} />
                <DateItem label="Cerrado"          value={t.closed_at ? formatDateTime(t.closed_at) : '—'} />
                <DateItem label="T. 1ª respuesta"  value={minutesToHuman(t.first_response_time_minutes)} />
                <DateItem label="T. resolución"    value={minutesToHuman(t.resolution_time_minutes)} />
              </div>
            </CardContent>
          </Card>

          {/* Comentarios */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Comentarios
            </h2>
            {comments.map((c) => {
              const cm = c as {
                id: string; body: string; is_internal: boolean; created_at: string
                author: { full_name: string } | null
              }
              return (
                <Card
                  key={cm.id}
                  className={cn(
                    'border-zinc-200 dark:border-zinc-800',
                    cm.is_internal && 'border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10'
                  )}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-2 mb-1">
                      {cm.is_internal && <Lock className="h-3 w-3 text-amber-500" />}
                      <span className="text-xs font-medium">{cm.author?.full_name ?? 'Sistema'}</span>
                      {cm.is_internal && <Badge variant="outline" className="text-xs">Interno</Badge>}
                      <span className="text-xs text-zinc-400 ml-auto">{formatRelative(cm.created_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{cm.body}</p>
                  </CardContent>
                </Card>
              )
            })}
            {/* Nuevo comentario */}
            <Card className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="py-3 px-4 space-y-3">
                <Textarea
                  placeholder="Agregar comentario…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={3}
                  disabled={isPending}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <Lock className="h-3 w-3" /> Solo visible para admin
                  </label>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentBody.trim() || isPending}
                  >
                    {isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                    <MessageSquare className="h-3 w-3 mr-1.5" />
                    Comentar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab: Gestión ─── */}
        <TabsContent value="gestion" className="space-y-4">
          {/* Cambiar estado */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Cambiar estado</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as TicketStatus)}
                  disabled={isPending || !allowedStatuses.length}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Nuevo estado…">
                      {newStatus ? STATUS_LABELS[newStatus as TicketStatus] : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allowedStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleChangeStatus}
                  disabled={!newStatus || isPending}
                  className={cn(
                    'w-full sm:w-auto font-semibold shadow-sm px-5 transition-colors',
                    newStatus === 'resuelto'   && 'bg-green-600 hover:bg-green-700 text-white',
                    newStatus === 'cerrado'    && 'bg-zinc-700 hover:bg-zinc-800 text-white',
                    newStatus === 'reabierto'  && 'bg-blue-600 hover:bg-blue-700 text-white',
                    newStatus === 'en_proceso' && 'bg-amber-500 hover:bg-amber-600 text-white',
                    newStatus === 'en_espera'  && 'bg-orange-500 hover:bg-orange-600 text-white',
                    !newStatus                 && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Cambiar estado
                </Button>
              </div>
              <Textarea
                placeholder="Comentario opcional sobre el cambio de estado…"
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
                rows={2}
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* Solución */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Solución y notas técnicas</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Solución técnica (solo admin)
                </Label>
                <Textarea
                  placeholder="Documenta detalladamente la solución aplicada…"
                  value={resSummary}
                  onChange={(e) => setResSummary(e.target.value)}
                  rows={4}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Solución visible para el usuario (opcional)</Label>
                <Textarea
                  placeholder="Resumen de la solución para mostrar al usuario…"
                  value={visibleRes}
                  onChange={(e) => setVisibleRes(e.target.value)}
                  rows={3}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Observaciones técnicas (solo admin)
                </Label>
                <Textarea
                  placeholder="Notas técnicas adicionales, pasos de diagnóstico, etc…"
                  value={techNotes}
                  onChange={(e) => setTechNotes(e.target.value)}
                  rows={3}
                  disabled={isPending}
                />
              </div>
              <Button onClick={handleSaveResolution} disabled={isPending} className="w-full">
                {isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                Guardar información
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: Historial ─── */}
        <TabsContent value="historial">
          <div className="relative pl-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
            {history.map((h) => {
              const entry = h as {
                id: string; to_status: string; from_status: string | null
                comment: string | null; created_at: string
                changer: { full_name: string } | null
              }
              return (
                <div key={entry.id} className="relative mb-4 pl-4">
                  <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950" />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
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
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      {formatRelative(entry.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DateItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
