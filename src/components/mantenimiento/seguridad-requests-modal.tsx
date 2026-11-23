'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ShieldAlert, X, Check, ChevronLeft, ChevronRight, Loader2, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatRelative } from '@/lib/utils'
import {
  MAINTENANCE_TYPE_LABELS, NIVEL_RIESGO_LABELS, NIVEL_RIESGO_COLORS, type Role,
} from '@/lib/types'
import type { PendingMantRequest } from '@/lib/seguridad-requests'
import { respondMantenimientoSupport } from '@/actions/seguridad-mantenimiento'

const DISMISSED_KEY = 'seguridad-mant-requests-dismissed'

function readDismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]') } catch { return [] }
}
function writeDismissed(ids: string[]) {
  try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)) } catch { /* sin storage */ }
}

export function SeguridadRequestsModal({ requests, role }: { requests: PendingMantRequest[]; role: Role }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [index,   setIndex]   = useState(0)
  const [busy,    setBusy]    = useState<'accept' | 'reject' | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason,    setReason]    = useState('')

  // super_admin solo lo ve dentro del módulo de mantenimiento
  const enabled = role === 'admin_mantenimiento' ||
    (role === 'super_admin' && pathname.startsWith('/admin/mantenimiento'))

  const idsKey = useMemo(() => requests.map((r) => r.id).join(','), [requests])

  useEffect(() => { setMounted(true) }, [])

  // Abrir solo si hay solicitudes que no se hayan pospuesto en esta sesión
  useEffect(() => {
    if (!enabled || !requests.length) { setOpen(false); return }
    const dismissed = readDismissed()
    if (requests.some((r) => !dismissed.includes(r.id))) setOpen(true)
    setIndex((i) => Math.min(i, requests.length - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idsKey])

  useEffect(() => { setRejecting(false); setReason('') }, [index, idsKey])

  if (!mounted || !enabled || !requests.length) return null

  const req = requests[Math.min(index, requests.length - 1)]

  function later() {
    writeDismissed([...new Set([...readDismissed(), ...requests.map((r) => r.id)])])
    setOpen(false)
  }

  async function respond(accept: boolean) {
    setBusy(accept ? 'accept' : 'reject')
    const r = await respondMantenimientoSupport(req.id, accept, accept ? undefined : reason)
    setBusy(null)
    if (r.error) { toast.error(r.error); router.refresh(); return }
    if (accept && 'maintenanceTicketId' in r && r.maintenanceTicketId) {
      toast.success(`Solicitud ${r.folio} creada a partir del reporte ${req.folio}`)
      setOpen(false)
      router.push(`/admin/mantenimiento/tickets/${r.maintenanceTicketId}`)
    } else {
      toast.success('Solicitud rechazada; Seguridad e Higiene fue notificado')
    }
    router.refresh()
  }

  if (!open) {
    return createPortal(
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-4 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-emerald-700 transition-colors"
      >
        <ShieldAlert className="h-4 w-4" />
        {requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'} de Seguridad
      </button>,
      document.body,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={later} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seg-req-title"
        className="relative w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 id="seg-req-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Seguridad e Higiene solicita apoyo
              </h2>
              <p className="text-xs text-zinc-500">
                {req.requestedBy} · {formatRelative(req.requestedAt)}
              </p>
            </div>
          </div>
          <button onClick={later} aria-label="Ver más tarde" className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-400">{req.folio}</span>
            <Badge className={cn('text-xs', NIVEL_RIESGO_COLORS[req.nivelRiesgo])}>
              Riesgo {NIVEL_RIESGO_LABELS[req.nivelRiesgo].toLowerCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">{MAINTENANCE_TYPE_LABELS[req.type]}</Badge>
          </div>

          <div>
            <p className="text-xs text-zinc-400">Se necesita</p>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{req.servicio}</p>
            {req.note && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{req.note}</p>}
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-1.5 text-sm">
            <p className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              {req.area ?? '—'} · {req.ubicacion}
            </p>
            {req.category && <p className="text-xs text-zinc-500">Reporte: {req.category}</p>}
            <p className="text-xs text-zinc-500 whitespace-pre-wrap line-clamp-4">{req.descripcion}</p>
          </div>

          {req.photoUrl && (
            <a href={req.photoUrl} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={req.photoUrl} alt={`Foto del reporte ${req.folio}`}
                className="w-full max-h-48 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800" />
            </a>
          )}

          {rejecting && (
            <div className="space-y-1.5">
              <label htmlFor="seg-req-reason" className="text-sm font-medium text-red-700 dark:text-red-400">
                Motivo del rechazo
              </label>
              <Textarea id="seg-req-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                autoFocus placeholder="Ej. no es una reparación de mantenimiento, corresponde a proveedor externo…" />
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3">
          {requests.length > 1 ? (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Button size="icon-sm" variant="ghost" aria-label="Anterior" disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              {index + 1} de {requests.length}
              <Button size="icon-sm" variant="ghost" aria-label="Siguiente" disabled={index >= requests.length - 1}
                onClick={() => setIndex((i) => i + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          ) : (
            <button onClick={later} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-left">
              Ver más tarde
            </button>
          )}

          <div className="flex gap-2">
            {rejecting ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setRejecting(false)} disabled={!!busy}>Volver</Button>
                <Button variant="destructive" size="sm" onClick={() => respond(false)}
                  disabled={!!busy || reason.trim().length < 3}>
                  {busy === 'reject' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <X className="h-4 w-4 mr-1.5" />}
                  Confirmar rechazo
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => setRejecting(true)} disabled={!!busy}>
                  Rechazar
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => respond(true)} disabled={!!busy}>
                  {busy === 'accept' ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                  Aceptar y crear solicitud
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
