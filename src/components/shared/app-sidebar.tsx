'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, useAnimationControls } from 'framer-motion'
import {
  LayoutDashboard, Monitor, Wrench, Settings, Users,
  BarChart3, ShieldCheck, History, Ticket, Bell, LogOut, HardHat,
} from 'lucide-react'
import {
  Button, Tooltip, User, Popover, PopoverTrigger,
  PopoverContent, Divider,
} from '@heroui/react'
import { ThemeToggleSlide } from '@/components/shared/theme-toggle-slide'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { toast } from 'sonner'
import type { Role, Profile } from '@/lib/types'

// ─── Framer-motion variants ────────────────────────────────

const containerVariants = {
  close: {
    width: '4.5rem',
    transition: { type: 'spring' as const, damping: 15, duration: 0.5 },
  },
  open: {
    width: '16rem',
    transition: { type: 'spring' as const, damping: 15, duration: 0.5 },
  },
}

const svgVariants = {
  close: { rotate: 360 },
  open:  { rotate: 180 },
}

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
  { href: '/dashboard',      icon: LayoutDashboard, label: 'Inicio'         },
  { href: '/mis-tickets',    icon: Ticket,          label: 'Mis Tickets'    },
  { href: '/notificaciones', icon: Bell,            label: 'Notificaciones' },
]

const TECNICO_ITEMS: NavItem[] = [
  { href: '/tecnico',        icon: Wrench,          label: 'Panel Técnico'  },
  { href: '/notificaciones', icon: Bell,            label: 'Notificaciones' },
]

function itemsForRole(role: Role): NavItem[] {
  if (role === 'admin_sistemas')        return SISTEMAS_ITEMS
  if (role === 'admin_mantenimiento')   return MANTENIMIENTO_ITEMS
  if (role === 'super_admin')           return SUPER_ITEMS
  if (role === 'usuario')               return USUARIO_ITEMS
  if (role === 'tecnico_mantenimiento') return TECNICO_ITEMS
  return []
}

interface Props {
  profile: Profile
  role: Role
  adminUnreadCount?: number
}

export function AppSidebar({ profile, role, adminUnreadCount = 0 }: Props) {
  const [isOpen, setIsOpen]           = useState(false)
  const containerControls             = useAnimationControls()
  const svgControls                   = useAnimationControls()
  const sidebarRef                    = useRef<HTMLElement>(null)
  const toggleBlockRef                = useRef(false)
  const pathname                      = usePathname()
  const router                        = useRouter()
  const supabase                      = createClient()
  const items                         = itemsForRole(role)

  useEffect(() => {
    containerControls.start(isOpen ? 'open' : 'close')
    svgControls.start(isOpen ? 'open' : 'close')
  }, [isOpen, containerControls, svgControls])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toggleBlockRef.current) { toggleBlockRef.current = false; return }
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

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
    const handler = () => {
      toggleBlockRef.current = true
      setIsOpen((v) => !v)
    }
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
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <motion.nav
        ref={sidebarRef as React.Ref<HTMLElement>}
        variants={containerVariants}
        animate={containerControls}
        initial="close"
        className={`fixed flex flex-col rounded-r-xl z-50 gap-16 p-3 md:p-4 top-0 left-0 h-dvh overflow-hidden
          shadow backdrop-blur-sm backdrop-saturate-150
          bg-background/60 dark:bg-default-100/50
          border-r border-gray-300 dark:border-gray-700/50
          transition-transform duration-300
          sm:translate-x-0
          ${!isOpen ? 'max-sm:-translate-x-full' : ''}`}
      >
      {/* ─── Header: user + arrow ─── */}
      <div className="flex flex-row w-full justify-between items-center min-w-0">
        <div className={isOpen ? 'min-w-0 flex-1' : 'hidden'}>
          {isOpen && (
            <Popover showArrow placement="right">
              <PopoverTrigger>
                <User
                  as="button"
                  name={
                    <span className="text-xs font-semibold truncate block max-w-[100px]">
                      {profile.full_name ?? 'Usuario'}
                    </span>
                  }
                  description={
                    <span className="text-[10px] truncate block max-w-[110px]">
                      {profile.email}
                    </span>
                  }
                  avatarProps={{
                    name: initials(profile.full_name),
                    size: 'sm',
                    classNames: {
                      base: 'bg-zinc-900 dark:bg-zinc-200 flex-shrink-0',
                      name: 'text-white dark:text-zinc-900 text-xs font-bold',
                    },
                  }}
                  classNames={{ wrapper: 'min-w-0 max-w-[120px]' }}
                />
              </PopoverTrigger>
              <PopoverContent className="p-4 w-[240px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-700">
                <div className="flex flex-col gap-3">
                  <User
                    name={profile.full_name ?? 'Usuario'}
                    description={profile.email}
                    avatarProps={{
                      name: initials(profile.full_name),
                      size: 'lg',
                      classNames: {
                        base: 'bg-zinc-900 dark:bg-zinc-200',
                        name: 'text-white dark:text-zinc-900 text-sm font-bold',
                      },
                    }}
                    classNames={{
                      name:        'text-zinc-900 dark:text-zinc-100',
                      description: 'text-zinc-500 dark:text-zinc-400',
                    }}
                  />
                  <Divider />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Última sesión: {new Date().toLocaleDateString('es-MX')}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Animated arrow */}
        <Tooltip placement="right" content="Abrir">
          <button
            className="p-1 rounded-full flex-shrink-0"
            onClick={() => setIsOpen((v) => !v)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5 md:size-6"
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={svgVariants}
                animate={svgControls}
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </svg>
          </button>
        </Tooltip>
      </div>

      {/* ─── Nav items ─── */}
      <div className="flex flex-col flex-grow basis-0 gap-1">
        {items.map(({ href, icon: Icon, label, badge }) => {
          const active    = href === '/admin' ? pathname === href : pathname.startsWith(href)
          const hasUnread = badge && adminUnreadCount > 0

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`overflow-hidden whitespace-nowrap tracking-wide flex gap-3 items-center
                cursor-pointer rounded-lg py-2 transition-colors
                ${isOpen ? 'px-2' : 'justify-center px-0'}
                ${active
                  ? 'text-blue-500 dark:text-blue-400 font-semibold'
                  : 'text-zinc-500 dark:text-white hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/60 dark:hover:bg-white/10'
                }`}
            >
              <div className="relative flex-shrink-0">
                <Icon size={18} />
                {hasUnread && !isOpen && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </div>
              {isOpen && (
                <span className="flex-1 text-sm truncate">
                  {label}
                  {hasUnread && (
                    <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
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
          isIconOnly={!isOpen}
          variant="light"
          color="danger"
          onPress={handleLogout}
          startContent={<LogOut size={16} />}
          className={isOpen ? 'flex justify-start w-full' : 'mx-auto'}
          size="sm"
        >
          {isOpen && <span className="font-normal text-sm">Cerrar Sesión</span>}
        </Button>
      </div>
      </motion.nav>
    </>
  )
}
