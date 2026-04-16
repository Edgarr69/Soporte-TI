'use client'

import { useRef, useState, useEffect } from 'react'
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
import { ChevronLeft, FileText, CheckCircle2, UserCheck, Play, Check, X, Upload, Download, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { changeMaintenanceStatus, addMaintenanceComment, uploadEvidencia, regeneratePdf, reassignTecnico, deleteEvidencia } from '@/actions/maintenance'
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
  prioridad?: 'baja' | 'normal' | 'alta'
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
  tecnico_reassigned_at?: string | null
  category: { name: string } | null
  user: { full_name: string | null; email: string } | null
}

interface Props {
  ticket: TicketData
  statusHistory: HistoryEntry[]
  comments: Comment[]
  evidencias: Evidencia[]
  technicians: Technician[]
  supabaseUrl: string
  isReopened?: boolean
}

export function AdminMaintenanceDetail({
  ticket, statusHistory, comments, evidencias, technicians, supabaseUrl, isReopened = false,
}: Props) {
  const router = useRouter()

  const [comment, setComment]           = useState('')
  const [isInternal, setIsInternal]     = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [transitioning, setTrans]       = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  useEffect(() => { setLocalComments(comments) }, [comments])

  // Assign panel state
  const [showAssign, setShowAssign]           = useState(false)
  const [assignTecnicoId,  setAssignTecnicoId] = useState('')
  const [fechaTermino, setFechaTermino]        = useState(ticket.fecha_termino_estimada ?? '')
  const [assignComment, setAssignComment]      = useState('')

  // Cancel panel
  const [showCancel,    setShowCancel]    = useState(false)
  const [cancelReason,  setCancelReason]  = useState('')

  // Reassign panel
  const [showReassign,       setShowReassign]       = useState(false)
  const [reassignTecnicoId,  setReassignTecnicoId]  = useState(ticket.tecnico_id ?? '')
  const [reassignComment,    setReassignComment]    = useState('')
  const [reassigning,        setReassigning]        = useState(false)

  // Upload / delete evidencia
  const [uploading,      setUploading]      = useState(false)
  const [generatingPdf,  setGeneratingPdf]  = useState(false)
  const [deletingEvid,   setDeletingEvid]   = useState<string | null>(null)
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
    const body = comment.trim()
    if (!body) return
    setSubmitting(true)
    setComment('')

    // Mostrar el comentario inmediatamente (optimistic)
    const optimistic: Comment = {
      id:          `temp-${Date.now()}`,
      body,
      is_internal: isInternal,
      created_at:  new Date().toISOString(),
      author:      null,
    }
    setLocalComments((prev) => [...prev, optimistic])

    const r = await addMaintenanceComment(ticket.id, body, isInternal)
    setSubmitting(false)
    if (r.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      setComment(body)
      return
    }
    router.refresh()
  }

  const [pdfCacheBust, setPdfCacheBust] = useState(() => Date.now())

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    const r = await regeneratePdf(ticket.id)
    setGeneratingPdf(false)
    if (r.error) { toast.error(r.error); return }
    setPdfCacheBust(Date.now())
    toast.success('PDF generado correctamente')
    router.refresh()
  }

  async function handleReassign() {
    if (!reassignTecnicoId) { toast.error('Selecciona un técnico'); return }
    setReassigning(true)
    const tech = technicians.find((t) => t.id === reassignTecnicoId)
    const nombre = tech ? (tech.full_name ?? tech.email) : reassignTecnicoId
    const r = await reassignTecnico(ticket.id, reassignTecnicoId, nombre, reassignComment || undefined)
    setReassigning(false)
    if (r.error) { toast.error(r.error); return }
    setShowReassign(false)
    setReassignComment('')
    toast.success('Técnico reasignado — regenera el PDF para actualizarlo')
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

  async function handleDeleteEvidencia(evidenciaId: string) {
    setDeletingEvid(evidenciaId)
    const r = await deleteEvidencia(evidenciaId, ticket.id)
    setDeletingEvid(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Archivo eliminado')
    router.refresh()
  }

  const pdfSistema     = evidencias.find((e) => e.type === 'pdf_sistema') ?? null
  const otherEvid      = evidencias.filter((e) => e.type === 'evidencia')
  const canGeneratePdf = !!ticket.tecnico_id && !pdfSistema && ticket.status !== 'terminado'
  const needsPdfRegen  = !!(
    ticket.tecnico_reassigned_at && pdfSistema &&
    ticket.tecnico_reassigned_at > pdfSistema.created_at
  )
  // Bloquear PDF cuando: reabierto (pendiente/en_revision) o ticket ya terminado
  const pdfBlockedByReopen = ['pendiente', 'en_revision', 'terminado'].includes(ticket.status) && !!pdfSistema

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
              {isReopened ? (
                <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  Reabierto
                </Badge>
              ) : (
                <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[ticket.status])}>
                  {MAINTENANCE_STATUS_LABELS[ticket.status]}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {MAINTENANCE_TYPE_LABELS[ticket.type]}
              </Badge>
              {ticket.prioridad === 'alta' && (
                <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Alta prioridad
                </Badge>
              )}
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
              <Button size="default" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm px-5"
                onClick={() => transition('en_revision')} disabled={transitioning}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Poner en revisión
              </Button>
            )}
            {canAssign && (
              <Button size="default" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md px-5"
                onClick={() => setShowAssign(true)} disabled={transitioning}>
                <UserCheck className="h-4 w-4 mr-2" />
                Aprobar y asignar
              </Button>
            )}
            {nextStatuses.includes('en_proceso') && (
              <Button size="default" className="w-full sm:w-auto font-semibold shadow-sm px-5 bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-900 disabled:text-white/60 transition-colors"
                onClick={() => transition('en_proceso')} disabled={transitioning}>
                <Play className="h-4 w-4 mr-2" />
                Iniciar trabajo
              </Button>
            )}
            {nextStatuses.includes('terminado') && (
              <Button size="default" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm px-5"
                onClick={() => transition('terminado')} disabled={transitioning}>
                <Check className="h-4 w-4 mr-2" />
                Marcar terminado
              </Button>
            )}
            {nextStatuses.includes('cancelado') && (
              <Button size="default" variant="outline" className="w-full sm:w-auto border-red-400 text-red-600 hover:bg-red-600 hover:text-white font-semibold shadow-sm px-5 transition-colors"
                onClick={() => setShowCancel(true)} disabled={transitioning}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            {nextStatuses.includes('pendiente') && (
              <Button size="default" variant="outline" className="w-full sm:w-auto border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold shadow-sm px-5 transition-colors"
                onClick={() => transition('pendiente')} disabled={transitioning}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reabrir
              </Button>
            )}
            {(ticket.status === 'asignado' || ticket.status === 'en_proceso') && (
              <Button size="default" variant="outline" className="w-full sm:w-auto border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold px-5"
                onClick={() => setShowReassign(true)} disabled={transitioning}>
                <UserCheck className="h-4 w-4 mr-2" />
                Reasignar técnico
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
                {technicians.length === 0 ? (
                  <p className="text-xs text-zinc-400">No hay técnicos disponibles registrados.</p>
                ) : (
                  <Select value={assignTecnicoId} onValueChange={(v) => v && setAssignTecnicoId(v)}>
                    <SelectTrigger><SelectValue placeholder="Selecciona técnico">
                      {assignTecnicoId ? (technicians.find((t) => t.id === assignTecnicoId)?.full_name ?? technicians.find((t) => t.id === assignTecnicoId)?.email) : undefined}
                    </SelectValue></SelectTrigger>
                    <SelectContent>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name ?? t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha término estimada</Label>
                <Input
                  type="date"
                  value={fechaTermino}
                  min={ticket.fecha_solicitud}
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
                  if (fechaTermino && fechaTermino < ticket.fecha_solicitud) {
                    toast.error('La fecha de término no puede ser anterior a la fecha de solicitud.')
                    return
                  }
                  const tech = technicians.find((t) => t.id === assignTecnicoId)
                  transition('asignado', {
                    tecnico_id:              assignTecnicoId || undefined,
                    tecnico_nombre_snapshot: tech ? (tech.full_name ?? tech.email) : undefined,
                    fecha_termino_estimada:  fechaTermino || undefined,
                    comment:                 assignComment || undefined,
                  })
                }}
                disabled={transitioning}
              >
                {transitioning ? 'Guardando…' : 'Confirmar asignación'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAssign(false); setAssignTecnicoId('') }}>Cancelar</Button>
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

      {/* Reassign panel */}
      {showReassign && (
        <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-700 dark:text-indigo-400">Reasignar técnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Técnico</Label>
              <Select value={reassignTecnicoId} onValueChange={(v) => v && setReassignTecnicoId(v)}>
                <SelectTrigger><SelectValue placeholder="Selecciona técnico">
                  {reassignTecnicoId ? (technicians.find((t) => t.id === reassignTecnicoId)?.full_name ?? technicians.find((t) => t.id === reassignTecnicoId)?.email) : undefined}
                </SelectValue></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name ?? t.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comentario (opcional)</Label>
              <Textarea
                value={reassignComment}
                onChange={(e) => setReassignComment(e.target.value)}
                rows={2}
                placeholder="Motivo de reasignación…"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleReassign} disabled={reassigning}>
                {reassigning ? 'Guardando…' : 'Confirmar reasignación'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowReassign(false); setReassignTecnicoId(ticket.tecnico_id ?? '') }}>Cancelar</Button>
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
              {/* Botón generar PDF: solo si hay técnico y aún no se generó */}
              {canGeneratePdf && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={generatingPdf}
                  onClick={handleGeneratePdf}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${generatingPdf ? 'animate-spin' : ''}`} />
                  {generatingPdf ? 'Generando PDF…' : 'Generar PDF'}
                </Button>
              )}

              {/* PDF generado (plantilla) */}
              {pdfSistema && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm flex-1 truncate text-zinc-700 dark:text-zinc-300">{pdfSistema.file_name}</span>
                  <span className="text-xs text-zinc-400 mr-1">PDF</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={generatingPdf || pdfBlockedByReopen}
                    title={pdfBlockedByReopen ? 'Asigna un técnico y fecha antes de regenerar' : undefined}
                    onClick={handleGeneratePdf}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${generatingPdf ? 'animate-spin' : ''}`} />
                    Regenerar
                  </Button>
                  {(needsPdfRegen || pdfBlockedByReopen) ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-medium cursor-not-allowed"
                      title={pdfBlockedByReopen ? 'Asigna un técnico y fecha antes de descargar' : 'Regenera el PDF antes de descargar'}>
                      <Download className="h-3 w-3" />
                      Descargar
                    </span>
                  ) : (
                    <a
                      href={`${storageUrl(pdfSistema.file_path)}?t=${pdfCacheBust}`}
                      download={pdfSistema.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:opacity-80 transition-opacity"
                    >
                      <Download className="h-3 w-3" />
                      Descargar
                    </a>
                  )}
                </div>
              )}

              {/* Evidencias (PDFs llenados / fotos) */}
              {otherEvid.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <a href={storageUrl(ev.file_path)} target="_blank" rel="noopener noreferrer"
                    className="text-sm flex-1 truncate hover:underline">
                    {ev.file_name}
                  </a>
                  <span className="text-xs text-zinc-400 mr-1">{formatDate(ev.created_at)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    disabled={deletingEvid === ev.id}
                    onClick={() => handleDeleteEvidencia(ev.id)}
                    title="Eliminar archivo"
                  >
                    <Trash2 className={`h-3 w-3 ${deletingEvid === ev.id ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              ))}

              {!canGeneratePdf && !pdfSistema && !otherEvid.length && (
                <p className="text-xs text-zinc-400">Sin documentos.</p>
              )}

              {/* Subir evidencia: solo disponible después de que exista el PDF */}
              {pdfSistema && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={uploading || pdfBlockedByReopen}
                    title={pdfBlockedByReopen ? 'Asigna un técnico y fecha antes de subir' : undefined}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploading ? 'Subiendo…' : 'Subir PDF llenado'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Comentarios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {localComments.length === 0 && (
                <p className="text-xs text-zinc-400">Sin comentarios.</p>
              )}
              {localComments.map((c) => (
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
