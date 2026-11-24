'use client'

import { useState, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Monitor, Wrench, Settings, Users,
  BarChart3, ShieldCheck, History, Ticket, Bell, LogOut, HardHat,
  ShieldAlert, ClipboardList, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggleSlide } from '@/components/shared/theme-toggle-slide'
import { createClient } from '@/lib/supabase/client'
import { initials, cn } from '@/lib/utils'
import {
  getSidebarOpen, getSidebarOpenServer, setSidebarOpen, subscribeSidebar, toggleSidebar,
} from '@/lib/sidebar-store'
import { toast } from 'sonner'
import type { Role, Profile } from '@/lib/types'

// ─── Nav items por rol ────────────────────────────────────

type NavItem  = { href: string; icon: React.ElementType; label: string; badge?: boolean; exact?: boolean }
type NavGroup = { group: true; key: string; icon: React.ElementType; label: string; items: NavItem[] }
type NavEntry = NavItem | NavGroup

const isGroup = (e: NavEntry): e is NavGroup => 'group' in e

const SISTEMAS_ITEMS: NavItem[] = [
  { href: '/admin/sistemas',          icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/admin/sistemas/tickets',  icon: Monitor,         label: 'Tickets'    },
  { href: '/admin/sistemas/reportes', icon: BarChart3,       label: 'Reportes'   },
  { href: '/admin/usuarios',          icon: Users,           label: 'Usuarios'   },
  { href: '/admin/historial',         icon: History,         label: 'Historial', badge: true },
]

const MANTENIMIENTO_ITEMS: NavItem[] = [
  { href: '/admin/mantenimiento',            icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/admin/mantenimiento/tickets',    icon: Wrench,          label: 'Solicitudes' },
  { href: '/admin/mantenimiento/tecnicos',   icon: HardHat,         label: 'Técnicos'    },
  { href: '/admin/mantenimiento/catalogos',  icon: Settings,        label: 'Catálogos'   },
  { href: '/admin/usuarios',                 icon: Users,           label: 'Usuarios'    },
  { href: '/admin/historial',                icon: History,         label: 'Historial', badge: true },
]

const SEGURIDAD_ITEMS: NavItem[] = [
  { href: '/admin/seguridad',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/seguridad/tickets',    icon: ClipboardList,   label: 'Reportes'  },
  { href: '/admin/seguridad/catalogos',  icon: Settings,        label: 'Catálogos' },
  { href: '/admin/usuarios',             icon: Users,           label: 'Usuarios'  },
  { href: '/admin/historial',            icon: History,         label: 'Historial', badge: true },
]

const SUPER_ITEMS: NavEntry[] = [
  { href: '/admin', icon: ShieldCheck, label: 'Panel general' },
  {
    group: true, key: 'sistemas', icon: Monitor, label: 'Sistemas',
    items: [
      { href: '/admin/sistemas',          icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/admin/sistemas/tickets',  icon: Monitor,         label: 'Tickets'   },
      { href: '/admin/sistemas/reportes', icon: BarChart3,       label: 'Reportes'  },
    ],
  },
  {
    group: true, key: 'mantenimiento', icon: Wrench, label: 'Mantenimiento',
    items: [
      { href: '/admin/mantenimiento',           icon: LayoutDashboard, label: 'Dashboard',   exact: true },
      { href: '/admin/mantenimiento/tickets',   icon: Wrench,          label: 'Solicitudes' },
      { href: '/admin/mantenimiento/tecnicos',  icon: HardHat,         label: 'Técnicos'    },
      { href: '/admin/mantenimiento/catalogos', icon: Settings,        label: 'Catálogos'   },
    ],
  },
  {
    group: true, key: 'seguridad', icon: ShieldAlert, label: 'Seguridad e Higiene',
    items: [
      { href: '/admin/seguridad',           icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/admin/seguridad/tickets',   icon: ClipboardList,   label: 'Reportes'  },
      { href: '/admin/seguridad/catalogos', icon: Settings,        label: 'Catálogos' },
    ],
  },
  {
    group: true, key: 'usuario', icon: Ticket, label: 'Usuario',
    items: [
      { href: '/dashboard',      icon: LayoutDashboard, label: 'Inicio'         },
      { href: '/mis-tickets',    icon: Ticket,          label: 'Mis Tickets'    },
      { href: '/notificaciones', icon: Bell,            label: 'Notificaciones' },
    ],
  },
  { href: '/admin/usuarios',  icon: Users,   label: 'Usuarios'  },
  { href: '/admin/historial', icon: History, label: 'Historial', badge: true },
]

const USUARIO_ITEMS: NavItem[] = [
  { href: '/dashboard',      icon: LayoutDashboard, label: 'Inicio'          },
  { href: '/mis-tickets',    icon: Ticket,          label: 'Mis Tickets'     },
  { href: '/notificaciones', icon: Bell,            label: 'Notificaciones', badge: true },
]

const TECNICO_ITEMS: NavItem[] = [
  { href: '/tecnico',        icon: Wrench, label: 'Panel Técnico'  },
  { href: '/notificaciones', icon: Bell,   label: 'Notificaciones' },
]

function itemsForRole(role: Role): NavEntry[] {
  if (role === 'admin_sistemas')        return SISTEMAS_ITEMS
  if (role === 'admin_mantenimiento')   return MANTENIMIENTO_ITEMS
  if (role === 'admin_seguridad')       return SEGURIDAD_ITEMS
  if (role === 'super_admin')           return SUPER_ITEMS
  if (role === 'usuario')               return USUARIO_ITEMS
  if (role === 'tecnico_mantenimiento') return TECNICO_ITEMS
  return []
}

function isNavActive(href: string, pathname: string, exact = false): boolean {
  if (href === '/admin' || exact) return pathname === href
  if (href === '/mis-tickets') {
    return pathname === '/mis-tickets'
        || pathname === '/tickets'
        || pathname.startsWith('/tickets/')
        || pathname.startsWith('/mantenimiento/')
        || pathname.startsWith('/seguridad/')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

interface Props {
  profile: Profile
  role: Role
  adminUnreadCount?: number
}

export function AppSidebar({ profile, role, adminUnreadCount = 0 }: Props) {
  const isOpen              = useSyncExternalStore(subscribeSidebar, getSidebarOpen, getSidebarOpenServer)
  const setIsOpen           = setSidebarOpen
  const pathname           = usePathname()
  const router              = useRouter()
  const supabase            = createClient()
  const items               = itemsForRole(role)
  // Grupos abiertos/cerrados manualmente; si el usuario no lo ha tocado,
  // el grupo que contiene la ruta actual se muestra expandido.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  function toggleGroup(key: string, currentlyExpanded: boolean) {
    if (!isOpen) {
      // Con el sidebar colapsado: abrirlo y mostrar el submenú
      setIsOpen(true)
      setOpenGroups((g) => ({ ...g, [key]: true }))
      return
    }
    setOpenGroups((g) => ({ ...g, [key]: !currentlyExpanded }))
  }

  function renderLink({ href, icon: Icon, label, badge, exact }: NavItem) {
    const active    = isNavActive(href, pathname, exact)
    const hasUnread = badge && adminUnreadCount > 0

    return (
      <Link
        key={href}
        href={href}
        title={isOpen ? undefined : label}
        aria-label={hasUnread ? `${label} — ${adminUnreadCount} sin leer` : undefined}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'overflow-hidden whitespace-nowrap tracking-wide flex gap-3 items-center',
          'cursor-pointer rounded-lg py-2 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
          isOpen ? 'px-2' : 'justify-center px-0',
          active
            ? 'text-blue-500 dark:text-blue-400 font-semibold'
            : 'text-zinc-500 dark:text-white hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-white/10',
        )}
      >
        <div className="relative flex-shrink-0" aria-hidden="true">
          <Icon size={18} />
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
          )}
        </div>
        {isOpen && (
          <span className="flex-1 text-sm truncate">
            {label}
            {hasUnread && (
              <span aria-hidden="true" className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
              </span>
            )}
          </span>
        )}
      </Link>
    )
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    window.addEventListener('sidebar:toggle', toggleSidebar)
    return () => window.removeEventListener('sidebar:toggle', toggleSidebar)
  }, [])

  // En escritorio el sidebar es fijo y empuja el contenido: los layouts usan
  // la clase .sidebar-offset, cuyo margen sale de esta variable CSS.
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', isOpen ? '16rem' : '4.5rem')
  }, [isOpen])

  async function handleLogout() {
    setIsOpen(false)
    await supabase.auth.signOut()
    toast.success('Sesión cerrada.')
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {isOpen && (
        <button
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-black/40 sm:hidden cursor-default"
          onClick={() => setIsOpen(false)}
        />
      )}
      <nav
        aria-label="Navegación principal"
        style={{
          width: isOpen ? '16rem' : '4.5rem',
          transition: 'width 500ms ease-in-out, transform 300ms ease-in-out',
        }}
        className={cn(
          'fixed flex flex-col rounded-r-xl z-50 gap-16 p-3 md:p-4 top-0 left-0 h-dvh overflow-hidden',
          'shadow backdrop-blur-sm backdrop-saturate-150',
          'bg-background/60 dark:bg-zinc-800/50',
          'border-r border-gray-300 dark:border-gray-700/50',
          'sm:translate-x-0',
          !isOpen && 'max-sm:-translate-x-full',
        )}
      >
        {/* ─── Header: user + arrow ─── */}
        <div className="flex flex-row w-full justify-between items-center min-w-0">
          {isOpen && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Avatar size="sm" className="flex-shrink-0">
                <AvatarFallback className="bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold">
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate max-w-[148px] text-zinc-900 dark:text-zinc-100">
                  {profile.full_name ?? 'Usuario'}
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[148px]">
                  {profile.email}
                </p>
              </div>
            </div>
          )}

          {/* Arrow button — rota 180° cuando el sidebar está abierto */}
          <button
            title={isOpen ? 'Cerrar' : 'Abrir'}
            className="p-1 rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onClick={toggleSidebar}
            aria-label={isOpen ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={isOpen}
            aria-controls="sidebar-nav"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              className={cn(
                'size-5 md:size-6 transition-transform duration-500 ease-in-out',
                isOpen && 'rotate-180',
              )}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>

        {/* ─── Nav items ─── */}
        <div id="sidebar-nav" className="flex flex-col flex-grow basis-0 gap-1 overflow-y-auto overflow-x-hidden">
          {items.map((entry) => {
            if (!isGroup(entry)) return renderLink(entry)

            const { key, icon: Icon, label, items: children } = entry
            const childActive = children.some((i) => isNavActive(i.href, pathname, i.exact))
            const groupOpen   = openGroups[key] ?? childActive
            const expanded    = isOpen && groupOpen

            return (
              <div key={key} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(key, groupOpen)}
                  title={isOpen ? undefined : label}
                  aria-expanded={expanded}
                  className={cn(
                    'overflow-hidden whitespace-nowrap tracking-wide flex gap-3 items-center w-full',
                    'cursor-pointer rounded-lg py-2 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                    isOpen ? 'px-2' : 'justify-center px-0',
                    childActive
                      ? 'text-blue-500 dark:text-blue-400 font-semibold'
                      : 'text-zinc-500 dark:text-white hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-white/10',
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left text-sm truncate">{label}</span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={cn('flex-shrink-0 transition-transform duration-200', expanded && 'rotate-180')}
                      />
                    </>
                  )}
                </button>
                {expanded && (
                  <div className="ml-4 pl-2 border-l border-zinc-200 dark:border-zinc-700 flex flex-col gap-0.5">
                    {children.map((child) => renderLink(child))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ─── Bottom: theme + logout ─── */}
        <div className="flex flex-col gap-2">
          <ThemeToggleSlide isOpen={isOpen} />

          <Button
            variant="ghost"
            size={isOpen ? 'sm' : 'icon-sm'}
            onClick={handleLogout}
            aria-label={isOpen ? undefined : 'Cerrar sesión'}
            className={cn(
              'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30',
              isOpen ? 'flex justify-start w-full gap-2' : 'mx-auto',
            )}
          >
            <LogOut size={16} />
            {isOpen && <span className="font-normal text-sm">Cerrar Sesión</span>}
          </Button>
        </div>
      </nav>
    </>
  )
}
