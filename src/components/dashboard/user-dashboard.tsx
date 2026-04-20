'use client'

import Link from 'next/link'
import { Wrench, Monitor, HardHat, ArrowRight } from 'lucide-react'
import type { ProfileExtended } from '@/lib/types'
import { cn } from '@/lib/utils'

export function DashboardHero({
  profile,
}: {
  profile: ProfileExtended & { department?: { name: string; allowed_ticket_types?: string[] | null } }
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = profile.full_name?.split(' ')[0] ?? 'usuario'
  const dept = profile.department?.name
  const allowedTypes = profile.department?.allowed_ticket_types ?? ['general', 'maquinaria']
  const canMaquinaria = allowedTypes.includes('maquinaria')

  return (
    <div className="flex flex-col gap-10 sm:gap-12 py-4 sm:py-8">

      {/* ── Saludo ── */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          {dept ?? 'Sin departamento'}
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
          {greeting},<br />
          <span className="text-zinc-500 dark:text-zinc-400">{firstName}.</span>
        </h1>
        <p className="text-base text-zinc-400 dark:text-zinc-500 pt-1">
          ¿En qué podemos ayudarte hoy?
        </p>
      </div>

      {/* ── Tarjetas de acción ── */}
      <div className={cn('grid grid-cols-1 gap-4 sm:gap-5', canMaquinaria ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        <ActionCard
          href="/tickets/nuevo"
          icon={Monitor}
          iconColor="text-white"
          iconBg="bg-zinc-900 dark:bg-zinc-100"
          accentClass="group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100"
          title="Sistemas"
          description="Reporta problemas de equipos, software, red o correo."
        />
        <ActionCard
          href="/mantenimiento/nuevo?tipo=general"
          icon={Wrench}
          iconColor="text-white"
          iconBg="bg-blue-600"
          accentClass="group-hover:bg-blue-600"
          title="Mantenimiento general"
          description="Instalaciones, edificio, áreas comunes y servicios."
        />
        {canMaquinaria && (
          <ActionCard
            href="/mantenimiento/nuevo?tipo=maquinaria"
            icon={HardHat}
            iconColor="text-white"
            iconBg="bg-indigo-600"
            accentClass="group-hover:bg-indigo-600"
            title="Maquinaria"
            description="Equipos de producción y maquinaria industrial."
          />
        )}
      </div>

    </div>
  )
}

function ActionCard({
  href, icon: Icon, iconColor, iconBg, accentClass, title, description,
}: {
  href:        string
  icon:        React.ElementType
  iconColor:   string
  iconBg:      string
  accentClass: string
  title:       string
  description: string
}) {
  return (
    <Link href={href} className="group block">
      <div className={cn(
        'relative h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900',
        'p-6 flex flex-col gap-4',
        'transition-all duration-200',
        'hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg dark:hover:shadow-zinc-900/50',
        'hover:-translate-y-0.5',
      )}>
        {/* Icono */}
        <div aria-hidden="true" className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>

        {/* Texto */}
        <div className="flex-1 space-y-1.5">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">{title}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{description}</p>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
          Crear solicitud
          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  )
}
