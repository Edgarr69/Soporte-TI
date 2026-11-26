'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LinkButton } from '@/components/ui/link-button'
import { ChatThread } from '@/components/shared/chat-thread'
import { HistorialTimeline } from '@/components/shared/historial-timeline'
import {
  SEGURIDAD_STATUS_LABELS, SEGURIDAD_STATUS_COLORS,
  NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS,
  type SeguridadStatus, type NivelRiesgo,
} from '@/lib/types'
import { formatDateTime, cn } from '@/lib/utils'
import { ArrowLeft, AlertTriangle, FileText, ShieldCheck } from 'lucide-react'
import { addSeguridadComment, cancelSeguridadReport } from '@/actions/seguridad'
import { createClient } from '@/lib/supabase/client'
import { onBroadcast } from '@/lib/realtime'
import { toast } from 'sonner'

export interface SeguridadHistoryEntry {
  id: string
  from_status: string | null
  to_status: string
  comment: string | null
  created_at: string
  changer: { full_name: string | null; email: string } | null
}

export interface SeguridadCommentRow {
  id: string
  body: string
  created_at: string
  is_internal?: boolean
  author_id: string | null
  author: { full_name: string | null; email: string } | null
}

export interface SeguridadEvidenciaRow {
  id: string
  file_name: string
  mime_type: string | null
  created_at: string
  url: string | null
}

interface Props {
  ticket: {
    id: string
    folio: string
    status: SeguridadStatus
    nivel_riesgo: NivelRiesgo
    category_name_snapshot: string | null
    department_name_snapshot: string | null
    area_name_snapshot: string | null
    ubicacion: string
    descripcion: string
    acciones_correctivas: string | null
    cancel_reason: string | null
    created_at: string
    mant_request_status?: string | null
    resolved_by_mantenimiento?: boolean
  }
  statusHistory: SeguridadHistoryEntry[]
  comments: SeguridadCommentRow[]
  evidencias: SeguridadEvidenciaRow[]
  currentUserId: string
  currentUserName: string
  isReopened?: boolean
}

export function SeguridadDetail({
  ticket, statusHistory, comments, evidencias, currentUserId, currentUserName, isReopened = false,
}: Props) {
  const router = useRouter()
  const [commentBody,   setCommentBody]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [cancelling,    setCancelling]    = useState(false)
  const [cancelReason,  setCancelReason]  = useState('')
  const [showCancel,    setShowCancel]    = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  useEffect(() => { setLocalComments(comments) }, [comments])

  useEffect(() => {
    const supabase = createClient()
    // Aviso por Broadcast (migración 020): solo trae id/author_id/is_internal;
    // el comentario completo se vuelve a leer abajo con la sesión (RLS)
    return onBroadcast(supabase, `seguridad_comments:${ticket.id}`, async (payload) => {
      const row = payload as { id: string; author_id: string | null; is_internal: boolean }
      if (row.author_id === currentUserId || row.is_internal) return
      const { data } = await supabase
        .from('seguridad_comments')
        .select('id, body, created_at, author_id, author:profiles(full_name, email)')
        .eq('id', row.id)
        .single()
      if (!data) return
      const author = Array.isArray(data.author) ? data.author[0] : data.author
      setLocalComments((prev) => {
        if (prev.some((c) => c.id === data.id)) return prev
        return [...prev, { ...data, author: author ?? null }]
      })
    })
  }, [ticket.id, currentUserId])

  async function submitComment() {
    const body = commentBody.trim()
    if (!body) return
    setSubmitting(true)
    setCommentBody('')
    const tempId = `temp-${Date.now()}`
    setLocalComments((prev) => [...prev, {
      id: tempId, body, created_at: new Date().toISOString(),
      author_id: currentUserId, author: { full_name: currentUserName, email: '' },
    }])
    const r = await addSeguridadComment(ticket.id, body)
    setSubmitting(false)
    if (r.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== tempId))
      setCommentBody(body)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    const r = await cancelSeguridadReport(ticket.id, cancelReason)
    setCancelling(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Reporte cancelado')
    setShowCancel(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <LinkButton href="/mis-tickets?tab=seguridad" variant="ghost" size="icon" className="-ml-2" aria-label="Volver a mis tickets">
          <ArrowLeft className="h-4 w-4" />
        </LinkButton>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
            <Badge className={cn('text-xs', NIVEL_RIESGO_COLORS[ticket.nivel_riesgo])}>
              Riesgo {NIVEL_RIESGO_LABELS[ticket.nivel_riesgo].toLowerCase()}
            </Badge>
            {isReopened && (
              <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                Reabierto
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-0.5">
            {ticket.category_name_snapshot ?? 'Reporte de seguridad'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Seguridad e Higiene</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={cn('text-xs', SEGURIDAD_STATUS_COLORS[ticket.status])}>
            {SEGURIDAD_STATUS_LABELS[ticket.status]}
          </Badge>
          {ticket.status === 'pendiente' && (
            <button
              onClick={() => setShowCancel(true)}
              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Cancelar reporte
            </button>
          )}
        </div>
      </div>

      {showCancel && (
        <Card className="border-red-300 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              ¿Confirmas que deseas cancelar este reporte?
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Chat */}
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          <ChatThread
            messages={localComments}
            currentUserId={currentUserId}
            value={commentBody}
            onChange={setCommentBody}
            onSubmit={submitComment}
            submitting={submitting}
            className="h-[calc(100vh-14rem)] min-h-[24rem]"
          />
        </div>

        {/* Info + historial */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Datos del reporte</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {ticket.descripcion}
              </p>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <InfoItem label="Departamento" value={ticket.department_name_snapshot ?? '—'} />
                <InfoItem label="Área"         value={ticket.area_name_snapshot ?? '—'} />
                <InfoItem label="Ubicación"    value={ticket.ubicacion} />
                <InfoItem label="Reportado"    value={formatDateTime(ticket.created_at)} />
              </div>
              {evidencias.length > 0 && (
                <>
                  <Separator />
                  <EvidenciasGrid evidencias={evidencias} />
                </>
              )}
            </CardContent>
          </Card>

          {ticket.mant_request_status === 'aceptada' && ticket.status !== 'terminado' && (
            <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20">
              <CardContent className="py-3 text-sm text-indigo-800 dark:text-indigo-300">
                Tu reporte fue turnado a Mantenimiento para la reparación. Se cerrará cuando terminen los trabajos.
              </CardContent>
            </Card>
          )}

          {ticket.acciones_correctivas && (
            <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800 dark:text-green-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Acciones correctivas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">
                  {ticket.acciones_correctivas}
                </p>
              </CardContent>
            </Card>
          )}

          {ticket.cancel_reason && (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 dark:text-red-300">Motivo de cancelación</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap">{ticket.cancel_reason}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Historial del reporte
            </h2>
            <HistorialTimeline
              entries={statusHistory}
              statusLabels={SEGURIDAD_STATUS_LABELS}
              statusColors={SEGURIDAD_STATUS_COLORS}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function EvidenciasGrid({
  evidencias, onDelete, deletingId,
}: {
  evidencias: SeguridadEvidenciaRow[]
  onDelete?: (id: string) => void
  deletingId?: string | null
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {evidencias.map((ev) => {
        const isImage = ev.mime_type?.startsWith('image/')
        return (
          <div key={ev.id} className="group relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
            {ev.url ? (
              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="block" title={ev.file_name}>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ev.url} alt={ev.file_name} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 flex flex-col items-center justify-center gap-1 px-2">
                    <FileText className="h-6 w-6 text-red-500" />
                    <span className="text-[11px] text-zinc-500 truncate max-w-full">{ev.file_name}</span>
                  </div>
                )}
              </a>
            ) : (
              <div className="h-28 flex items-center justify-center text-xs text-zinc-400 px-2 text-center">
                {ev.file_name}
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(ev.id)}
                disabled={deletingId === ev.id}
                aria-label={`Eliminar ${ev.file_name}`}
                className="absolute top-1 right-1 rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] text-white hover:bg-red-600 transition-colors"
              >
                {deletingId === ev.id ? '…' : 'Eliminar'}
              </button>
            )}
          </div>
        )
      })}
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
