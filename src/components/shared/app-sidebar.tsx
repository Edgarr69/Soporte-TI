'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Monitor, Wrench, Settings, Users,
  BarChart3, ShieldCheck, History, Ticket, Bell, LogOut, HardHat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeToggleSlide } from '@/components/shared/theme-toggle-slide'
import { createClient } from '@/lib/supabase/client'
import { initials, cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Role, Profile } from '@/lib/types'

// ─── Nav items por rol ────────────────────────────────────

type NavItem = { href: string; icon: React.ElementType; label: string; badge?: boolean }

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

const SUPER_ITEMS: NavItem[] = [
  { href: '/admin',                         icon: ShieldCheck,     label: 'General'    },
  { href: '/admin/sistemas',                icon: Monitor,         label: 'Sistemas'   },
  { href: '/admin/mantenimiento',           icon: Wrench,          label: 'Mant.'      },
  { href: '/admin/usuarios',                icon: Users,           label: 'Usuarios'   },
  { href: '/admin/sistemas/reportes',       icon: BarChart3,       label: 'Reportes'   },
  { href: '/admin/historial',               icon: History,         label: 'Historial', badge: true },
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

function itemsForRole(role: Role): NavItem[] {
  if (role === 'admin_sistemas')        return SISTEMAS_ITEMS
  if (role === 'admin_mantenimiento')   return MANTENIMIENTO_ITEMS
  if (role === 'super_admin')           return SUPER_ITEMS
  if (role === 'usuario')               return USUARIO_ITEMS
  if (role === 'tecnico_mantenimiento') return TECNICO_ITEMS
  return []
}

function isNavActive(href: string, pathname: string): boolean {
  if (href === '/admin') return pathname === href
  if (href === '/mis-tickets') {
    return pathname === '/mis-tickets'
        || pathname === '/tickets'
        || pathname.startsWith('/tickets/')
        || pathname.startsWith('/mantenimiento/')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

interface Props {
  profile: Profile
  role: Role
  adminUnreadCount?: number
}

export function AppSidebar({ profile, role, adminUnreadCount = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const sidebarRef          = useRef<HTMLElement>(null)
  const pathname            = usePathname()
  const router              = useRouter()
  const supabase            = createClient()
  const items               = itemsForRole(role)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const handler = () => setIsOpen((v) => !v)
    window.addEventListener('sidebar:toggle', handler)
    return () => window.removeEventListener('sidebar:toggle', handler)
  }, [])

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
        ref={sidebarRef as React.Ref<HTMLElement>}
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
            onClick={() => setIsOpen((v) => !v)}
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
        <div id="sidebar-nav" className="flex flex-col flex-grow basis-0 gap-1">
          {items.map(({ href, icon: Icon, label, badge }) => {
            const active    = isNavActive(href, pathname)
            const hasUnread = badge && adminUnreadCount > 0

            return (
              <Link
                key={href}
                href={href}
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
          })}
        </div>

        {/* ─── Bottom: theme + logout ─── */}
        <div className="flex flex-col gap-2">
          <ThemeToggleSlide isOpen={isOpen} />

          <Button
            variant="ghost"
            size={isOpen ? 'sm' : 'icon-sm'}
            onClick={handleLogout}
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
