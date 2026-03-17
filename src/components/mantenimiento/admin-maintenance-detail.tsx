'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { HistorialTimeline } from '@/components/shared/historial-timeline'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS, MAINTENANCE_TRANSITIONS,
  MAINTENANCE_TYPE_LABELS,
  type MaintenanceStatus, type MaintenanceType,
} from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { ChevronLeft, FileText, CheckCircle2, UserCheck, Play, Check, X, Upload, Download } from 'lucide-react'
import { changeMaintenanceStatus, addMaintenanceComment, uploadEvidencia } from '@/actions/maintenance'
import { toast } from 'sonner'

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
  is_internal: boolean
  created_at: string
  author: { full_name: string; email: string } | null
}

interface Evidencia {
  id: string
  file_name: string
  file_path: string
  type: 'pdf_sistema' | 'evidencia'
  created_at: string
}

interface Technician {
  id: string
  full_name: string | null
  email: string
}

interface TicketData {
  id: string
  folio: string
  type: MaintenanceType
  status: MaintenanceStatus
  servicio: string
  descripcion: string
  encargado_nombre: string
  department_name_snapshot: string | null
  area_name_snapshot: string | null
  tecnico_id: string | null
  tecnico_nombre_snapshot: string | null
  fecha_solicitud: string
  fecha_termino_estimada: string | null
  cancel_reason: string | null
  created_at: string
  updated_at: string
  category: { name: string } | null
  user: { full_name: string | null; email: string } | null
}

interface Props {
  ticket: TicketData
  statusHistory: HistoryEntry[]
  comments: Comment[]
  evidencias: Evidencia[]
  technicians: Technician[]
  currentAdminId: string
  supabaseUrl: string
}

export function AdminMaintenanceDetail({
  ticket, statusHistory, comments, evidencias, technicians, supabaseUrl,
}: Props) {
  const router = useRouter()

  const [comment, setComment]         = useState('')
  const [isInternal, setIsInternal]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [transitioning, setTrans]     = useState(false)

  // Assign panel state
  const [showAssign, setShowAssign]   = useState(false)
  const [tecnicoId,  setTecnicoId]    = useState(ticket.tecnico_id ?? '')
  const [fechaTermino, setFechaTermino] = useState(ticket.fecha_termino_estimada ?? '')
  const [assignComment, setAssignComment] = useState('')

  // Cancel panel
  const [showCancel,    setShowCancel]    = useState(false)
  const [cancelReason,  setCancelReason]  = useState('')

  // Upload evidencia
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const nextStatuses = MAINTENANCE_TRANSITIONS[ticket.status] ?? []
  const canAssign = nextStatuses.includes('asignado')

  function storageUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/maintenance-docs/${path}`
  }

  async function transition(to: MaintenanceStatus, opts?: Parameters<typeof changeMaintenanceStatus>[2]) {
    setTrans(true)
    const r = await changeMaintenanceStatus(ticket.id, to, opts)
    setTrans(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(`Estado → ${MAINTENANCE_STATUS_LABELS[to]}`)
    setShowAssign(false)
    setShowCancel(false)
    router.refresh()
  }

  async function submitComment() {
    if (!comment.trim()) return
    setSubmitting(true)
    const r = await addMaintenanceComment(ticket.id, comment.trim(), isInternal)
    setSubmitting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Comentario enviado')
    setComment('')
    router.refresh()
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    const fd = new FormData()
    for (const f of Array.from(files)) fd.append('files', f)
    const r = await uploadEvidencia(ticket.id, fd)
    setUploading(false)
    if ('error' in r && r.error) { toast.error(r.error); return }
    toast.success(`${r.uploaded} archivo(s) subido(s)`)
    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  const pdfSistema = evidencias.find((e) => e.type === 'pdf_sistema')
  const otherEvid  = evidencias.filter((e) => e.type === 'evidencia')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <LinkButton href="/admin/mantenimiento/tickets" variant="ghost" size="sm" className="-ml-2 mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Solicitudes
        </LinkButton>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
              <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[ticket.status])}>
                {MAINTENANCE_STATUS_LABELS[ticket.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {MAINTENANCE_TYPE_LABELS[ticket.type]}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{ticket.servicio}</h1>
            <p className="text-sm text-zinc-500">
              {ticket.user?.full_name ?? ticket.user?.email ?? '—'}
              {ticket.category ? ` · ${ticket.category.name}` : ''}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {nextStatuses.includes('en_revision') && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => transition('en_revision')} disabled={transitioning}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Poner en revisión
              </Button>
            )}
            {canAssign && (
              <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowAssign(true)} disabled={transitioning}>
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Aprobar y asignar
              </Button>
            )}
            {nextStatuses.includes('en_proceso') && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => transition('en_proceso')} disabled={transitioning}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Iniciar trabajo
              </Button>
            )}
            {nextStatuses.includes('terminado') && (
              <Button size="sm" className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => transition('terminado')} disabled={transitioning}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Marcar terminado
              </Button>
            )}
            {nextStatuses.includes('cancelado') && (
              <Button size="sm" variant="outline" className="w-full sm:w-auto border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => setShowCancel(true)} disabled={transitioning}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Assign panel */}
      {showAssign && (
        <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400">Aprobar y asignar técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Técnico</Label>
                <Select value={tecnicoId} onValueChange={(v) => v && setTecnicoId(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecciona técnico">
                    {tecnicoId ? (technicians.find((t) => t.id === tecnicoId)?.full_name ?? technicians.find((t) => t.id === tecnicoId)?.email) : undefined}
                  </SelectValue></SelectTrigger>
                  <SelectContent>
                    {technicians.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name ?? t.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha término estimada</Label>
                <Input
                  type="date"
                  value={fechaTermino}
                  onChange={(e) => setFechaTermino(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Comentario (opcional)</Label>
              <Textarea
                value={assignComment}
                onChange={(e) => setAssignComment(e.target.value)}
                rows={2}
                placeholder="Instrucciones para el técnico…"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const tech = technicians.find((t) => t.id === tecnicoId)
                  transition('asignado', {
                    tecnico_id:              tecnicoId || undefined,
                    tecnico_nombre_snapshot: tech ? (tech.full_name ?? tech.email) : undefined,
                    fecha_termino_estimada:  fechaTermino || undefined,
                    comment:                 assignComment || undefined,
                  })
                }}
                disabled={transitioning}
              >
                {transitioning ? 'Guardando…' : 'Confirmar asignación'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAssign(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel panel */}
      {showCancel && (
        <Card className="border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Motivo de cancelación</p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="Describe el motivo…"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive"
                onClick={() => transition('cancelado', { cancel_reason: cancelReason || undefined })}
                disabled={transitioning}>
                {transitioning ? 'Cancelando…' : 'Confirmar cancelación'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Datos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Datos de la solicitud</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Solicitante"    value={ticket.user?.full_name ?? ticket.user?.email ?? '—'} />
              <Row label="Departamento"   value={ticket.department_name_snapshot ?? '—'} />
              <Row label="Área"           value={ticket.area_name_snapshot ?? '—'} />
              <Row label="Encargado"      value={ticket.encargado_nombre} />
              <Row label="Fecha solicitud" value={formatDate(ticket.fecha_solicitud)} />
              <Row label="Término estimado" value={ticket.fecha_termino_estimada ? formatDate(ticket.fecha_termino_estimada) : '—'} />
              {ticket.tecnico_nombre_snapshot && (
                <Row label="Técnico asignado" value={ticket.tecnico_nombre_snapshot} />
              )}
              {ticket.cancel_reason && (
                <Row label="Motivo cancelación" value={ticket.cancel_reason} />
              )}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 font-medium mb-1">Descripción</p>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{ticket.descripcion}</p>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Documentos y evidencias</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pdfSistema ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate text-zinc-700 dark:text-zinc-300">{pdfSistema.file_name}</span>
                  <span className="text-xs text-zinc-400 mr-1">PDF Sistema</span>
                  <a
                    href={storageUrl(pdfSistema.file_path)}
                    download={pdfSistema.file_name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    <Download className="h-3 w-3" />
                    Descargar
                  </a>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">PDF no generado aún.</p>
              )}
              {otherEvid.map((ev) => (
                <a key={ev.id} href={storageUrl(ev.file_path)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate">{ev.file_name}</span>
                  <span className="text-xs text-zinc-400">{formatDate(ev.created_at)}</span>
                </a>
              ))}
              {!pdfSistema && !otherEvid.length && (
                <p className="text-xs text-zinc-400">Sin documentos.</p>
              )}

              {/* Upload */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploading ? 'Subiendo…' : 'Subir evidencia / PDF llenado'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Comentarios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-zinc-400">Sin comentarios.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className={cn(
                  'text-sm border-l-2 pl-3',
                  c.is_internal
                    ? 'border-amber-400 dark:border-amber-600'
                    : 'border-zinc-200 dark:border-zinc-700'
                )}>
                  <p className="font-medium text-zinc-700 dark:text-zinc-300">
                    {c.author?.full_name ?? c.author?.email ?? '?'}
                    {c.is_internal && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
                        Interno
                      </span>
                    )}
                    <span className="text-xs font-normal text-zinc-400 ml-2">{formatDate(c.created_at)}</span>
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">{c.body}</p>
                </div>
              ))}

              <div className="space-y-2 pt-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario…"
                  rows={2}
                  disabled={submitting}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      disabled={submitting}
                      className="rounded"
                    />
                    Solo visible para admins
                  </label>
                  <Button size="sm" onClick={submitComment} disabled={submitting || !comment.trim()}>
                    Enviar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
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
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-2">
      <span className="text-zinc-400 sm:w-36 sm:flex-shrink-0">{label}</span>
      <span className="text-zinc-700 dark:text-zinc-300 flex-1">{value}</span>
    </div>
  )
}
