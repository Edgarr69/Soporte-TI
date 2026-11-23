'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wrench, Loader2, Undo2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import {
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS, MAINTENANCE_TYPE_LABELS, MANT_REQUEST_LABELS,
  type MaintenanceStatus, type MaintenanceType, type MantRequestStatus, type SeguridadStatus,
} from '@/lib/types'
import { requestMantenimientoSupport, withdrawMantenimientoSupport } from '@/actions/seguridad-mantenimiento'

export interface MantSupportInfo {
  status: MantRequestStatus | null
  type: MaintenanceType | null
  servicio: string | null
  note: string | null
  requestedAt: string | null
  respondedAt: string | null
  rejectReason: string | null
  resolvedByMantenimiento: boolean
  maintenanceTicket: {
    folio: string
    status: MaintenanceStatus
    tecnico: string | null
  } | null
}

interface Props {
  ticketId: string
  ticketStatus: SeguridadStatus
  defaultServicio: string
  info: MantSupportInfo
}

export function MantSupportCard({ ticketId, ticketStatus, defaultServicio, info }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [type,     setType]     = useState<MaintenanceType>('general')
  const [servicio, setServicio] = useState(defaultServicio)
  const [note,     setNote]     = useState('')
  const [busy,     setBusy]     = useState(false)

  const canRequest = ['en_revision', 'en_proceso'].includes(ticketStatus) &&
    info.status !== 'pendiente' && info.status !== 'aceptada'

  async function submit() {
    setBusy(true)
    const r = await requestMantenimientoSupport(ticketId, { type, servicio, note })
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Solicitud enviada a Mantenimiento')
    setShowForm(false)
    setNote('')
    router.refresh()
  }

  async function withdraw() {
    setBusy(true)
    const r = await withdrawMantenimientoSupport(ticketId)
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Solicitud retirada')
    router.refresh()
  }

  // Sin historial de apoyo y sin poder pedirlo: no mostrar nada
  if (!info.status && !info.maintenanceTicket && !canRequest) return null

  return (
    <Card className={cn(
      info.status === 'pendiente' && 'border-amber-300 dark:border-amber-900',
      info.status === 'aceptada'  && 'border-indigo-300 dark:border-indigo-900',
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Wrench className="h-4 w-4" />
          Apoyo de Mantenimiento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {info.status && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {info.status === 'pendiente' && <Clock className="h-4 w-4 text-amber-500" />}
              {info.status === 'aceptada'  && <CheckCircle2 className="h-4 w-4 text-indigo-500" />}
              {(info.status === 'rechazada' || info.status === 'cancelada') && <XCircle className="h-4 w-4 text-red-500" />}
              <span className="font-medium">{MANT_REQUEST_LABELS[info.status]}</span>
              {info.type && <Badge variant="outline" className="text-xs">{MAINTENANCE_TYPE_LABELS[info.type]}</Badge>}
            </div>
            {info.servicio && <p className="text-zinc-600 dark:text-zinc-400">Servicio: {info.servicio}</p>}
            {info.note && <p className="text-zinc-500 whitespace-pre-wrap text-xs">{info.note}</p>}
            {info.requestedAt && (
              <p className="text-xs text-zinc-400">
                Solicitado {formatRelative(info.requestedAt)}
                {info.respondedAt ? ` · respondido ${formatRelative(info.respondedAt)}` : ''}
              </p>
            )}
            {info.rejectReason && (info.status === 'rechazada' || info.status === 'cancelada') && (
              <p className="text-xs text-red-600 dark:text-red-400">Motivo: {info.rejectReason}</p>
            )}
            {(info.status === 'rechazada' || info.status === 'cancelada') && (
              <p className="text-xs text-zinc-500">Seguridad e Higiene debe atender y cerrar este reporte.</p>
            )}
          </div>
        )}

        {info.maintenanceTicket && (
          <div className="flex items-center gap-2 flex-wrap rounded-lg bg-zinc-50 dark:bg-zinc-900 px-3 py-2">
            <span className="text-xs font-mono text-zinc-500">{info.maintenanceTicket.folio}</span>
            <Badge className={cn('text-xs', MAINTENANCE_STATUS_COLORS[info.maintenanceTicket.status])}>
              {MAINTENANCE_STATUS_LABELS[info.maintenanceTicket.status]}
            </Badge>
            {info.maintenanceTicket.tecnico && (
              <span className="text-xs text-zinc-500">Técnico: {info.maintenanceTicket.tecnico}</span>
            )}
            {info.resolvedByMantenimiento && (
              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Terminado por Mantenimiento
              </Badge>
            )}
          </div>
        )}

        {info.status === 'pendiente' && (
          <Button size="sm" variant="outline" onClick={withdraw} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1.5" />}
            Retirar solicitud
          </Button>
        )}

        {canRequest && !showForm && (
          <div className="space-y-1.5">
            {!info.status && (
              <p className="text-xs text-zinc-500">
                ¿Se necesita reparar algo? Mantenimiento recibirá la solicitud para aceptarla o rechazarla.
              </p>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <Wrench className="h-3.5 w-3.5 mr-1.5" />
              {info.status ? 'Solicitar de nuevo' : 'Solicitar apoyo a Mantenimiento'}
            </Button>
          </div>
        )}

        {canRequest && showForm && (
          <div className="space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mant-type">Tipo</Label>
                <Select value={type} onValueChange={(v) => v && setType(v as MaintenanceType)}>
                  <SelectTrigger id="mant-type"><SelectValue>{MAINTENANCE_TYPE_LABELS[type]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{MAINTENANCE_TYPE_LABELS.general}</SelectItem>
                    <SelectItem value="maquinaria">{MAINTENANCE_TYPE_LABELS.maquinaria}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mant-servicio">¿Qué se necesita reparar?</Label>
                <Input id="mant-servicio" value={servicio} onChange={(e) => setServicio(e.target.value)} maxLength={200} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mant-note">Indicaciones para Mantenimiento (opcional)</Label>
              <Textarea id="mant-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000}
                placeholder="Ej. cambiar el cable dañado del tablero y colocar tapa" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={submit} disabled={busy || servicio.trim().length < 3}>
                {busy ? 'Enviando…' : 'Enviar a Mantenimiento'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} disabled={busy}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
