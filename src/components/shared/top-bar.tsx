'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { NotificationBell } from '@/components/shared/notification-bell'
import type { Role } from '@/lib/types'

const TITLES: [string, string][] = [
  ['/admin/sistemas/tickets',         'Tickets de Sistemas'],
  ['/admin/sistemas/reportes',        'Reportes'],
  ['/admin/sistemas',                 'Panel de Sistemas'],
  ['/admin/mantenimiento/tickets',    'Solicitudes'],
  ['/admin/mantenimiento/reportes',   'Reportes'],
  ['/admin/mantenimiento/catalogos',  'Catálogos'],
  ['/admin/mantenimiento',            'Panel de Mantenimiento'],
  ['/admin/usuarios',                 'Gestión de Usuarios'],
  ['/admin/historial',                'Historial de Actividad'],
  ['/admin',                          'Panel General'],
  ['/mis-tickets',                    'Mis Tickets'],
  ['/tickets/nuevo',                  'Nuevo Ticket'],
  ['/tickets',                        'Mis Tickets'],
  ['/mantenimiento/nuevo',            'Nueva Solicitud'],
  ['/mantenimiento',                  'Solicitud de Mantenimiento'],
  ['/notificaciones',                 'Notificaciones'],
  ['/dashboard',                      'Mi Panel'],
  ['/tecnico',                        'Panel Técnico'],
]

function getTitle(pathname: string): string {
  for (const [prefix, label] of TITLES) {
    if (pathname === prefix) return label
    if (pathname.startsWith(prefix) && pathname[prefix.length] === '/') return label
  }
  return 'Panel'
}

interface Props {
  unreadCount: number
  userId: string
  role: Role
}

export function TopBar({ unreadCount, userId, role }: Props) {
  const pathname = usePathname()
  const title    = getTitle(pathname)

  return (
    <div className="sticky top-0 z-40 h-12 flex items-center justify-between px-3 md:px-4
      shadow backdrop-blur-sm backdrop-saturate-150
      bg-background/60 dark:bg-default-100/50
      border-b border-gray-300 dark:border-gray-700/50"
    >
      {/* Botón hamburguesa - solo móvil */}
      <button
        className="sm:hidden p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative z-10"
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
      </button>

      {/* Centro: logo en móvil, título en tablet+ */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/favicon.png"
          alt="Logo"
          width={28}
          height={28}
          className="rounded-full object-cover sm:hidden"
          priority
        />
        <h1 className="hidden sm:block text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h1>
      </div>

      {/* Campana a la derecha */}
      <div className="ml-auto relative z-10">
        <NotificationBell unreadCount={unreadCount} userId={userId} role={role} />
      </div>
    </div>
  )
}
