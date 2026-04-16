'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { HistorialTimeline } from '@/components/shared/historial-timeline'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import {
  ChevronLeft, FileText, Upload, Send, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { addMaintenanceComment, cancelMaintenanceTicket, uploadEvidencia } from '@/actions/maintenance'
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

interface Evidencia {
  id: string
  file_name: string
  file_path: string
  mime_type: string | null
  type: 'pdf_sistema' | 'evidencia'
  created_at: string
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
  evidencias: Evidencia[]
  currentUserId: string
  supabaseUrl: string
  isReopened?: boolean
}

export function MaintenanceDetail({
  ticket, statusHistory, comments, evidencias, currentUserId, supabaseUrl, isReopened = false,
}: Props) {
  const router = useRouter()
  const [commentBody, setCommentBody]     = useState('')
  const [submitting,  setSubmitting]      = useState(false)
  const [cancelling,  setCancelling]      = useState(false)
  const [cancelReason, setCancelReason]   = useState('')
  const [showCancel,  setShowCancel]      = useState(false)
  const [uploading,   setUploading]       = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  // Sincronizar cuando el servidor refresca los datos
  useEffect(() => { setLocalComments(comments) }, [comments])

  const canCancel = ticket.status === 'pendiente'
  const canUpload = ticket.status !== 'cancelado'

  const otherEvidencias = evidencias.filter((e) => e.type === 'evidencia')

  async function submitComment() {
    const body = commentBody.trim()
    if (!body) return
    setSubmitting(true)
    setCommentBody('')

    // Mostrar el comentario inmediatamente (optimistic)
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('files', f))
    const r = await uploadEvidencia(ticket.id, fd)
    if ('error' in r) { toast.error(r.error); setUploading(false); return }
    toast.success(`${r.uploaded} archivo(s) subido(s)`)
    setUploading(false)
    router.refresh()
  }

  function storageUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/maintenance-docs/${path}`
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <LinkButton href="/mis-tickets" variant="ghost" size="sm" className="-ml-2 mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Mis tickets
        </LinkButton>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
              {isReopened ? (
                <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Reabierto
                </Badge>
              ) : (
                <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[ticket.status])}>
                  {MAINTENANCE_STATUS_LABELS[ticket.status]}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {ticket.servicio}
            </h1>
            <p className="text-sm text-zinc-500">
              {MAINTENANCE_TYPE_LABELS[ticket.type]}
              {ticket.category ? ` · ${ticket.category.name}` : ''}
            </p>
          </div>
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCancel(true)}
              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Cancelar solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Cancel dialog */}
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
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelando…' : 'Sí, cancelar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCancel(false)}
                disabled={cancelling}
              >
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — detail */}
        <div className="lg:col-span-2 space-y-4">

          {/* Datos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalles de la solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Departamento"  value={ticket.department_name_snapshot ?? '—'} />
              <Row label="Área"          value={ticket.area_name_snapshot ?? '—'} />
              <Row label="Encargado"     value={ticket.encargado_nombre} />
              <Row label="Fecha solicitud" value={formatDate(ticket.fecha_solicitud)} />
              {ticket.tecnico_nombre_snapshot && (
                <Row label="Técnico asignado" value={ticket.tecnico_nombre_snapshot} />
              )}
              {ticket.cancel_reason && (
                <Row label="Motivo cancelación" value={ticket.cancel_reason} />
              )}
              <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 font-medium mb-1">Descripción</p>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap text-sm">
                  {ticket.descripcion}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {otherEvidencias.map((ev) => (
                <a
                  key={ev.id}
                  href={storageUrl(ev.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate">{ev.file_name}</span>
                  <span className="text-xs text-zinc-400">
                    {formatDate(ev.created_at)}
                  </span>
                </a>
              ))}

              {!canUpload && otherEvidencias.length === 0 && (
                <p className="text-xs text-zinc-400">Sin documentos adjuntos.</p>
              )}

              {canUpload && (
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  <span className="text-sm text-zinc-500">
                    {uploading ? 'Subiendo…' : 'Subir evidencia (PDF / JPG)'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={handleUpload}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Comentarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {localComments.length === 0 && (
                <p className="text-xs text-zinc-400">Sin comentarios aún.</p>
              )}
              {localComments.map((c) => (
                <div key={c.id} className="text-sm border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {c.author?.full_name ?? c.author?.email ?? 'Usuario'}
                    <span className="text-xs font-normal text-zinc-400 ml-2">{formatDate(c.created_at)}</span>
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{c.body}</p>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
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
            </CardContent>
          </Card>
        </div>

        {/* Right — timeline */}
        <div>
          <HistorialTimeline
            entries={statusHistory.map((h) => ({
              id:          h.id,
              from_status: h.from_status,
              to_status:   h.to_status,
              comment:     h.comment,
              created_at:  h.created_at,
              changer:     h.changer,
            }))}
            statusLabels={MAINTENANCE_STATUS_LABELS}
            statusColors={MAINTENANCE_STATUS_COLORS}
          />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-400 w-28 sm:w-36 flex-shrink-0">{label}</span>
      <span className="text-zinc-700 dark:text-zinc-300 flex-1 min-w-0 break-words">{value}</span>
    </div>
  )
}
