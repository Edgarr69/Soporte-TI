'use client'

import { useState, useEffect } from 'react'
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
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react'
import { addMaintenanceComment, cancelMaintenanceTicket } from '@/actions/maintenance'
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
  isReopened?: boolean
}

export function MaintenanceDetail({
  ticket, statusHistory, comments, isReopened = false,
}: Props) {
  const router = useRouter()
  const [commentBody, setCommentBody] = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel]   = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  useEffect(() => { setLocalComments(comments) }, [comments])

  const canCancel = ticket.status === 'pendiente'

  async function submitComment() {
    const body = commentBody.trim()
    if (!body) return
    setSubmitting(true)
    setCommentBody('')

    const optimistic: Comment = {
      id:         `temp-${Date.now()}`,
      body,
      created_at: new Date().toISOString(),
      author:     null,
    }
    setLocalComments((prev) => [...prev, optimistic])

    const r = await addMaintenanceComment(ticket.id, body)
    setSubmitting(false)
    if (r.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      setCommentBody(body)
      return
    }
    router.refresh()
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
              Cancelar
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

      {/* Datos de la solicitud */}
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
            <InfoItem label="Departamento"   value={ticket.department_name_snapshot ?? '—'} />
            <InfoItem label="Área"           value={ticket.area_name_snapshot ?? '—'} />
            <InfoItem label="Encargado"      value={ticket.encargado_nombre} />
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

      {/* Comentarios del equipo */}
      {localComments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Comentarios del equipo de soporte
          </h2>
          {localComments.map((c) => (
            <Card key={c.id} className="border-zinc-200 dark:border-zinc-800">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {c.author?.full_name ?? c.author?.email ?? 'Soporte TI'}
                  </span>
                  <span className="text-xs text-zinc-400">{formatRelative(c.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enviar comentario */}
      <div className="flex gap-2">
        <Textarea
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          placeholder="Escribe un comentario…"
          rows={2}
          disabled={submitting}
          className="flex-1"
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

      {/* Historial */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Historial del ticket
        </h2>
        <div className="relative pl-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
          {statusHistory.map((h) => (
            <div key={h.id} className="relative mb-4 pl-4">
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
                <span className="text-xs text-zinc-400 flex-shrink-0">{formatRelative(h.created_at)}</span>
              </div>
            </div>
          ))}
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
