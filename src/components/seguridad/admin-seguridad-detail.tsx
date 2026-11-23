'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { HistorialTimeline } from '@/components/shared/historial-timeline'
import { ChatThread } from '@/components/shared/chat-thread'
import { MantSupportCard, type MantSupportInfo } from '@/components/seguridad/mant-support-card'
import {
  EvidenciasGrid,
  type SeguridadCommentRow, type SeguridadEvidenciaRow, type SeguridadHistoryEntry,
} from '@/components/seguridad/seguridad-detail'
import {
  SEGURIDAD_STATUS_LABELS, SEGURIDAD_STATUS_COLORS, SEGURIDAD_TRANSITIONS,
  NIVELES_RIESGO, NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS,
  type SeguridadStatus, type NivelRiesgo,
} from '@/lib/types'
import { cn, formatDateTime, minutesToHuman } from '@/lib/utils'
import { ChevronLeft, Search, Play, Check, X, RotateCcw, Upload, Loader2, Save } from 'lucide-react'
import {
  changeSeguridadStatus, addSeguridadComment, updateSeguridadAtencion,
  uploadSeguridadEvidencia, deleteSeguridadEvidencia,
} from '@/actions/seguridad'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TicketData {
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
  first_response_minutes: number | null
  resolution_time_minutes: number | null
  created_at: string
  user: { full_name: string | null; email: string } | null
}

interface Props {
  ticket: TicketData
  statusHistory: SeguridadHistoryEntry[]
  comments: SeguridadCommentRow[]
  evidencias: SeguridadEvidenciaRow[]
  currentUserId: string
  currentUserName: string
  isReopened?: boolean
  mantSupport: MantSupportInfo
}

export function AdminSeguridadDetail({
  ticket, statusHistory, comments, evidencias, currentUserId, currentUserName, isReopened = false, mantSupport,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [transitioning, setTrans]       = useState(false)
  const [showCancel,    setShowCancel]  = useState(false)
  const [cancelReason,  setCancelReason] = useState('')

  const [acciones,      setAcciones]    = useState(ticket.acciones_correctivas ?? '')
  const [riesgo,        setRiesgo]      = useState<NivelRiesgo>(ticket.nivel_riesgo)
  const [savingAtencion, setSavingAtencion] = useState(false)

  const [uploading,  setUploading]  = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [comment,       setComment]       = useState('')
  const [isInternal,    setIsInternal]    = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [localComments, setLocalComments] = useState(comments)

  useEffect(() => { setLocalComments(comments) }, [comments])
  useEffect(() => {
    setAcciones(ticket.acciones_correctivas ?? '')
    setRiesgo(ticket.nivel_riesgo)
  }, [ticket.acciones_correctivas, ticket.nivel_riesgo])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-seguridad-comments-${ticket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'seguridad_comments',
        filter: `ticket_id=eq.${ticket.id}`,
      }, async (payload) => {
        const row = payload.new as { id: string; author_id: string | null }
        if (row.author_id === currentUserId) return
        const { data } = await supabase
          .from('seguridad_comments')
          .select('id, body, is_internal, created_at, author_id, author:profiles(full_name, email)')
          .eq('id', row.id)
          .single()
        if (!data) return
        const author = Array.isArray(data.author) ? data.author[0] : data.author
        setLocalComments((prev) => {
          if (prev.some((c) => c.id === data.id)) return prev
          return [...prev, { ...data, author: author ?? null }]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [ticket.id, currentUserId])

  const next = SEGURIDAD_TRANSITIONS[ticket.status] ?? []
  const isClosed = ticket.status === 'terminado' || ticket.status === 'cancelado'
  // Con apoyo pendiente o aceptado, el cierre lo decide Mantenimiento
  const lockedByMant = mantSupport.status === 'pendiente' || mantSupport.status === 'aceptada'
  const lockTitle = mantSupport.status === 'pendiente'
    ? 'Hay una solicitud pendiente con Mantenimiento'
    : 'Mantenimiento está atendiendo este reporte'
  const atencionDirty = acciones.trim() !== (ticket.acciones_correctivas ?? '').trim() || riesgo !== ticket.nivel_riesgo

  async function transition(to: SeguridadStatus, opts?: Parameters<typeof changeSeguridadStatus>[2]) {
    setTrans(true)
    const r = await changeSeguridadStatus(ticket.id, to, opts)
    setTrans(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(`Estado → ${SEGURIDAD_STATUS_LABELS[to]}`)
    setShowCancel(false)
    router.refresh()
  }

  async function saveAtencion() {
    setSavingAtencion(true)
    const r = await updateSeguridadAtencion(ticket.id, { acciones_correctivas: acciones, nivel_riesgo: riesgo })
    setSavingAtencion(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Cambios guardados')
    router.refresh()
  }

  function markAttended() {
    if (!acciones.trim()) {
      toast.error('Registra las acciones correctivas antes de marcar como atendido')
      return
    }
    transition('terminado', { acciones_correctivas: acciones })
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    const fd = new FormData()
    for (const f of Array.from(files)) fd.append('files', f)
    const r = await uploadSeguridadEvidencia(ticket.id, fd)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (r.error) { toast.error(r.error); return }
    toast.success(`${r.uploaded} archivo(s) subido(s)`)
    router.refresh()
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const r = await deleteSeguridadEvidencia(id, ticket.id)
    setDeletingId(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Archivo eliminado')
    router.refresh()
  }

  async function submitComment() {
    const body = comment.trim()
    if (!body) return
    setSubmitting(true)
    setComment('')
    const tempId = `temp-${Date.now()}`
    setLocalComments((prev) => [...prev, {
      id: tempId, body, is_internal: isInternal, created_at: new Date().toISOString(),
      author_id: currentUserId, author: { full_name: currentUserName, email: '' },
    }])
    const r = await addSeguridadComment(ticket.id, body, isInternal)
    setSubmitting(false)
    if (r.error) {
      toast.error(r.error)
      setLocalComments((prev) => prev.filter((c) => c.id !== tempId))
      setComment(body)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <LinkButton href="/admin/seguridad/tickets" variant="ghost" size="sm" className="-ml-2 mb-2">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Reportes
        </LinkButton>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-zinc-400">{ticket.folio}</span>
              {isReopened ? (
                <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">Reabierto</Badge>
              ) : (
                <Badge className={cn('text-xs', SEGURIDAD_STATUS_COLORS[ticket.status])}>
                  {SEGURIDAD_STATUS_LABELS[ticket.status]}
                </Badge>
              )}
              <Badge className={cn('text-xs', NIVEL_RIESGO_COLORS[ticket.nivel_riesgo])}>
                Riesgo {NIVEL_RIESGO_LABELS[ticket.nivel_riesgo].toLowerCase()}
              </Badge>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
              {ticket.category_name_snapshot ?? 'Reporte de seguridad'}
            </h1>
            <p className="text-sm text-zinc-500">
              {ticket.user?.full_name ?? ticket.user?.email ?? '—'} · {formatDateTime(ticket.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {next.includes('en_revision') && (
              <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5"
                onClick={() => transition('en_revision')} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Revisar
              </Button>
            )}
            {next.includes('en_proceso') && (
              <Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold px-5"
                onClick={() => transition('en_proceso')} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Iniciar atención
              </Button>
            )}
            {next.includes('terminado') && (
              <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-5"
                onClick={markAttended} disabled={transitioning || lockedByMant}
                title={lockedByMant ? lockTitle : !acciones.trim() ? 'Registra las acciones correctivas primero' : undefined}>
                {transitioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Marcar atendido
              </Button>
            )}
            {next.includes('cancelado') && (
              <Button variant="outline" className="w-full sm:w-auto border-red-400 text-red-600 hover:bg-red-600 hover:text-white font-semibold px-5"
                onClick={() => setShowCancel(true)} disabled={transitioning || lockedByMant}
                title={lockedByMant ? lockTitle : undefined}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            {next.includes('pendiente') && (
              <Button variant="outline" className="w-full sm:w-auto border-blue-400 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-5"
                onClick={() => transition('pendiente')} disabled={transitioning}>
                {transitioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Reabrir
              </Button>
            )}
          </div>
        </div>
      </div>

      {showCancel && (
        <Card className="border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="pt-4 space-y-3">
            <Label htmlFor="cancel-reason" className="text-red-700 dark:text-red-400">Motivo de cancelación</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="Ej. reporte duplicado, no corresponde a seguridad…"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" disabled={transitioning}
                onClick={() => transition('cancelado', { cancel_reason: cancelReason || undefined })}>
                {transitioning ? 'Cancelando…' : 'Confirmar cancelación'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCancel(false)}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Datos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Datos del reporte</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <Row label="Reportó"      value={ticket.user?.full_name ?? ticket.user?.email ?? '—'} />
              <Row label="Departamento" value={ticket.department_name_snapshot ?? '—'} />
              <Row label="Área"         value={ticket.area_name_snapshot ?? '—'} />
              <Row label="Ubicación"    value={ticket.ubicacion} />
              {ticket.first_response_minutes !== null && (
                <Row label="Primera respuesta" value={minutesToHuman(ticket.first_response_minutes)} />
              )}
              {ticket.resolution_time_minutes !== null && (
                <Row label="Tiempo de atención" value={minutesToHuman(ticket.resolution_time_minutes)} />
              )}
              {ticket.cancel_reason && <Row label="Motivo cancelación" value={ticket.cancel_reason} />}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 font-medium mb-1">Descripción</p>
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{ticket.descripcion}</p>
              </div>
            </CardContent>
          </Card>

          <MantSupportCard
            ticketId={ticket.id}
            ticketStatus={ticket.status}
            defaultServicio={ticket.category_name_snapshot ?? ''}
            info={mantSupport}
          />

          {/* Atención */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Atención</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5 sm:max-w-xs">
                <Label htmlFor="riesgo">Nivel de riesgo (evaluado)</Label>
                <Select value={riesgo} onValueChange={(v) => v && setRiesgo(v as NivelRiesgo)}>
                  <SelectTrigger id="riesgo"><SelectValue>{NIVEL_RIESGO_LABELS[riesgo]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {NIVELES_RIESGO.map((n) => (
                      <SelectItem key={n} value={n}>{NIVEL_RIESGO_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acciones">Acciones correctivas</Label>
                <Textarea
                  id="acciones"
                  value={acciones}
                  onChange={(e) => setAcciones(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="Qué se hizo para eliminar o controlar el riesgo. El usuario verá este texto."
                />
              </div>
              <Button size="sm" variant="outline" onClick={saveAtencion} disabled={savingAtencion || !atencionDirty}>
                {savingAtencion ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Guardar
              </Button>
            </CardContent>
          </Card>

          {/* Evidencias */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fotos y evidencias</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {evidencias.length > 0 ? (
                <EvidenciasGrid
                  evidencias={evidencias}
                  onDelete={isClosed ? undefined : handleDelete}
                  deletingId={deletingId}
                />
              ) : (
                <p className="text-xs text-zinc-400">Sin archivos.</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              <Button size="sm" variant="outline" className="w-full" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {uploading ? 'Subiendo…' : 'Subir evidencia (foto o PDF)'}
              </Button>
            </CardContent>
          </Card>

          <ChatThread
            messages={localComments}
            currentUserId={currentUserId}
            value={comment}
            onChange={setComment}
            onSubmit={submitComment}
            submitting={submitting}
            showInternalToggle
            isInternal={isInternal}
            onInternalChange={setIsInternal}
            className="h-[28rem]"
          />
        </div>

        <div>
          <HistorialTimeline
            entries={statusHistory}
            statusLabels={SEGURIDAD_STATUS_LABELS}
            statusColors={SEGURIDAD_STATUS_COLORS}
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
