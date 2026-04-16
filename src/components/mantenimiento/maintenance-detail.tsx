'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LinkButton } from '@/components/ui/link-button'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { formatDate, formatRelative, cn } from '@/lib/utils'
import { ArrowLeft, Send, AlertTriangle, MessageSquare } from 'lucide-react'
import { addMaintenanceComment, cancelMaintenanceTicket } from '@/actions/maintenance'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface HistoryEntry {
  id: string
  from_status: string | null
  to_status: string
  comment: string | null
  created_at: string
  changer: { full_name: string; email: string } | null
}

interface Comment {
  id: string
  body: string
  created_at: string
  author_id: string | null
  author: { full_name: string; email: string } | null
}

interface Props {
  ticket: {
    id: string
    folio: string
    type: MaintenanceType
    status: MaintenanceStatus
    servicio: string
    descripcion: string
    encargado_nombre: string
    department_name_snapshot: string | null
    area_name_snapshot: string | null
    tecnico_nombre_snapshot: string | null
    fecha_solicitud: string
    cancel_reason: string | null
    created_at: string
    updated_at: string
    category: { name: string } | null
  }
  statusHistory: HistoryEntry[]
  comments: Comment[]
  currentUserId: string
  currentUserName: string
  isReopened?: boolean
}

export function MaintenanceDetail({
  ticket, statusHistory, comments, currentUserId, currentUserName, isReopened = false,
}: Props) {
  const router = useRouter()
  const [commentBody, setCommentBody]     = useState('')
  const [submitting,  setSubmitting]      = useState(false)
  const [cancelling,  setCancelling]      = useState(false)
  const [cancelReason, setCancelReason]   = useState('')
  const [showCancel,  setShowCancel]      = useState(false)
  const [localComments, setLocalComments] = useState(comments)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalComments(comments) }, [comments])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`maintenance-comments-${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'maintenance_comments',
        filter: `ticket_id=eq.${ticket.id}`,
      }, async (payload) => {
        const row = payload.new as { id: string; author_id: string | null }
        if (row.author_id === currentUserId) return
        const { data } = await supabase
          .from('maintenance_comments')
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
  }, [ticket.id, currentUserId])

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localComments])

  const canCancel = ticket.status === 'pendiente'

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

    const r = await addMaintenanceComment(ticket.id, body)
    setSubmitting(false)
    if (r.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentBody(body)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    const r = await cancelMaintenanceTicket(ticket.id, cancelReason)
    if (r.error) { toast.error(r.error); setCancelling(false); return }
    toast.success('Solicitud cancelada')
    setShowCancel(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <LinkButton href="/mis-tickets" variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
            {isReopened && (
              <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                Reabierto
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            {ticket.servicio}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {MAINTENANCE_TYPE_LABELS[ticket.type]}
            {ticket.category ? ` · ${ticket.category.name}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[ticket.status])}>
            {MAINTENANCE_STATUS_LABELS[ticket.status]}
          </Badge>
          {canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Cancelar solicitud
            </button>
          )}
        </div>
      </div>

      {/* Diálogo de cancelación */}
      {showCancel && (
        <Card className="border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              ¿Confirmas que deseas cancelar esta solicitud?
            </p>
            <Textarea
              placeholder="Motivo de cancelación (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              disabled={cancelling}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)} disabled={cancelling}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layout: chat izquierda, info derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Chat ── */}
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <Card className="border-zinc-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-14rem)]">
            <CardHeader className="pb-2 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Mensajes
                {localComments.length > 0 && (
                  <span className="text-xs font-normal text-zinc-400">({localComments.length})</span>
                )}
              </CardTitle>
            </CardHeader>

            {/* Burbujeas */}
            <CardContent className="flex-1 overflow-y-auto py-4 px-3 space-y-3 min-h-0">
              {localComments.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs text-zinc-400 text-center">
                    Sin mensajes aún.<br />Escribe uno para comenzar.
                  </p>
                </div>
              )}

              {localComments.map((c) => {
                const isMe = c.author_id === currentUserId
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'flex flex-col gap-0.5 max-w-[82%]',
                      isMe ? 'ml-auto items-end' : 'mr-auto items-start',
                    )}
                  >
                    {!isMe && (
                      <span className="text-[11px] text-zinc-500 px-1 font-medium">
                        {c.author?.full_name ?? c.author?.email ?? '—'}
                      </span>
                    )}
                    <div
                      className={cn(
                        'px-3 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed',
                        isMe
                          ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-bl-sm',
                      )}
                    >
                      {c.body}
                    </div>
                    <span className="text-[10px] text-zinc-400 px-1">
                      {formatRelative(c.created_at)}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-zinc-100 dark:border-zinc-800 flex-shrink-0">
              <Textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitComment()
                  }
                }}
                placeholder="Escribe un mensaje… (Enter para enviar)"
                rows={2}
                disabled={submitting}
                className="flex-1 resize-none text-sm"
              />
              <Button
                size="sm"
                onClick={submitComment}
                disabled={submitting || !commentBody.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Info + Historial ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Datos */}
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Datos de la solicitud</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {ticket.descripcion}
              </p>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <InfoItem label="Departamento"    value={ticket.department_name_snapshot ?? '—'} />
                <InfoItem label="Área"            value={ticket.area_name_snapshot ?? '—'} />
                <InfoItem label="Encargado"       value={ticket.encargado_nombre} />
                <InfoItem label="Fecha solicitud" value={formatDate(ticket.fecha_solicitud)} />
                {ticket.tecnico_nombre_snapshot && (
                  <InfoItem label="Técnico asignado" value={ticket.tecnico_nombre_snapshot} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Motivo de cancelación */}
          {ticket.cancel_reason && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 dark:text-red-300">Motivo de cancelación</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">
                  {ticket.cancel_reason}
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
              {statusHistory.map((h) => (
                <div key={h.id} className="relative mb-4 pl-4 last:mb-0">
                  <div className="absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950" />
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[h.to_status as MaintenanceStatus])}>
                          {MAINTENANCE_STATUS_LABELS[h.to_status as MaintenanceStatus] ?? h.to_status}
                        </Badge>
                        {h.from_status && (
                          <span className="text-xs text-zinc-400">
                            desde {MAINTENANCE_STATUS_LABELS[h.from_status as MaintenanceStatus] ?? h.from_status}
                          </span>
                        )}
                      </div>
                      {h.comment && (
                        <p className="text-xs text-zinc-500 mt-0.5">{h.comment}</p>
                      )}
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {h.changer?.full_name ?? 'Sistema'}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      {formatRelative(h.created_at)}
                    </span>
                  </div>
                </div>
              ))}
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
