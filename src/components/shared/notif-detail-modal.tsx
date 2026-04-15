'use client'

import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, User, Calendar, Tag, FileText, ArrowRight } from 'lucide-react'
import type { AdminNotification, AdminNotificationType, Notification, NotificationType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Etiquetas ────────────────────────────────────────────

export const MODULE_LABELS: Record<string, string> = {
  sistemas:      'Sistemas',
  mantenimiento: 'Mantenimiento',
  global:        'General',
}
export const MODULE_COLORS: Record<string, string> = {
  sistemas:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  mantenimiento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  global:        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

const ADMIN_TYPE_LABELS: Record<AdminNotificationType, string> = {
  user_created:               'Usuario creado',
  user_role_changed:          'Rol de usuario actualizado',
  ticket_created:             'Ticket creado',
  ticket_status_changed:      'Estado de ticket actualizado',
  ticket_closed:              'Ticket cerrado',
  ticket_reopened:            'Ticket reabierto',
  maintenance_created:        'Solicitud de mantenimiento creada',
  maintenance_status_changed: 'Estado de solicitud actualizado',
  maintenance_assigned:       'Técnico asignado',
  maintenance_closed:         'Solicitud terminada',
  maintenance_cancelled:      'Solicitud cancelada',
}

const USER_TYPE_LABELS: Record<NotificationType, string> = {
  ticket_created:  'Ticket creado',
  status_changed:  'Estado actualizado',
  comment_added:   'Nuevo comentario',
  ticket_reopened: 'Ticket reabierto',
  assigned:        'Asignación',
}

const TARGET_TYPE_LABELS: Record<string, string> = {
  ticket:             'Ticket de sistemas',
  maintenance_ticket: 'Solicitud de mantenimiento',
  user:               'Usuario',
}

// ─── NotifItem: tipo interno enriquecido ──────────────────

export interface NotifItem {
  id: string
  title: string
  body: string | null
  created_at: string
  is_read: boolean
  href: string | null
  module: string | null
  typeLabel: string
  actorName: string | null
  folio: string | null
  targetType: string | null
  metadata: Record<string, unknown> | null
}

export function toNotifItem(n: Notification): NotifItem {
  return {
    id:         n.id,
    title:      n.title,
    body:       n.body,
    created_at: n.created_at,
    is_read:    n.is_read,
    href:       n.ticket_id ? `/tickets/${n.ticket_id}` : null,
    module:     n.module,
    typeLabel:  USER_TYPE_LABELS[n.type] ?? n.type,
    actorName:  null,
    folio:      null,
    targetType: n.ticket_id ? 'ticket' : null,
    metadata:   null,
  }
}

export function toAdminNotifItem(n: AdminNotification): NotifItem {
  let href: string | null = null
  if (n.target_type === 'ticket')             href = `/admin/sistemas/tickets/${n.target_id}`
  if (n.target_type === 'maintenance_ticket') href = `/admin/mantenimiento/tickets/${n.target_id}`
  return {
    id:         n.id,
    title:      n.title,
    body:       n.message,
    created_at: n.created_at,
    is_read:    n.is_read,
    href,
    module:     n.module,
    typeLabel:  ADMIN_TYPE_LABELS[n.type] ?? n.type,
    actorName:  n.actor_name,
    folio:      n.target_folio,
    targetType: n.target_type,
    metadata:   n.metadata,
  }
}

// ─── Fila de detalle ──────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <Icon size={14} className="text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {label}
        </p>
        <p className="text-sm text-zinc-800 dark:text-zinc-200 break-words">{value}</p>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────

interface Props {
  item: NotifItem
  onClose: () => void
}

export function NotifDetailModal({ item, onClose }: Props) {
  const date     = format(new Date(item.created_at), "EEEE d 'de' MMMM yyyy, HH:mm", { locale: es })
  const mod      = item.module
  const modColor = mod ? (MODULE_COLORS[mod] ?? MODULE_COLORS.global) : MODULE_COLORS.global
  const modLabel = mod ? (MODULE_LABELS[mod] ?? mod) : 'General'

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', modColor)}>
              {modLabel}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.typeLabel}</span>
          </div>

          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 pr-8 leading-snug">
            {item.title}
          </h2>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          {item.body && (
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {item.body}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {item.actorName && (
              <DetailRow icon={User}     label="Realizado por" value={item.actorName} />
            )}
            {item.folio && (
              <DetailRow icon={FileText} label="Folio"         value={item.folio} />
            )}
            {item.targetType && (
              <DetailRow icon={Tag}      label="Tipo"          value={TARGET_TYPE_LABELS[item.targetType] ?? item.targetType} />
            )}
            <DetailRow   icon={Calendar} label="Fecha y hora"  value={date} />
          </div>

          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {Object.entries(item.metadata).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2 gap-4">
                  <span className="text-xs text-zinc-400 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300 text-right break-all">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {item.href && (
          <div className="px-6 pb-6">
            <Link
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between w-full rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-3 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors group"
            >
              <span className="text-sm font-semibold">Ver detalle completo</span>
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
