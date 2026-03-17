'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, Wrench, Ticket } from 'lucide-react'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_COLORS,
  MAINTENANCE_STATUS_LABELS, MAINTENANCE_STATUS_COLORS,
  type TicketStatus, type Priority, type MaintenanceStatus,
} from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { LinkButton } from '@/components/ui/link-button'

interface SysRow {
  id: string; folio: string; status: string; priority: string
  description: string; is_reopened: boolean; created_at: string
  ticket_categories: { name: string } | null
  ticket_subcategories: { name: string } | null
}

interface MaintRow {
  id: string; folio: string; type: string; status: string
  servicio: string; descripcion: string; created_at: string; encargado_nombre: string
}

interface Props {
  sysTickets: SysRow[]
  generalTickets: MaintRow[]
  maqTickets: MaintRow[]
}

export function MisTicketsTabs({ sysTickets, generalTickets, maqTickets }: Props) {
  const searchParams = useSearchParams()
  const defaultTab   = searchParams.get('tab') ?? 'sistemas'

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-4 w-full sm:w-auto overflow-x-auto">
        <TabsTrigger value="sistemas" className="gap-1.5">
          <Monitor className="h-3.5 w-3.5" />
          Sistemas
          <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-4">{sysTickets.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="general" className="gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Mant. General
          <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-4">{generalTickets.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="maquinaria" className="gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          Maquinaria
          <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0 h-4">{maqTickets.length}</Badge>
        </TabsTrigger>
      </TabsList>

      {/* ── Sistemas ── */}
      <TabsContent value="sistemas">
        <div className="flex justify-end mb-3">
          <LinkButton href="/tickets/nuevo" size="sm">+ Nuevo ticket</LinkButton>
        </div>
        <TicketListSection
          items={sysTickets}
          empty="No tienes tickets de sistemas."
          renderItem={(t) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                        <span className="text-sm font-semibold truncate">
                          {t.ticket_categories?.name ?? '—'} · {t.ticket_subcategories?.name ?? '—'}
                        </span>
                        {t.is_reopened && (
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">Reabierto</Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{t.description}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{formatDate(t.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge className={cn('text-xs', STATUS_COLORS[t.status as TicketStatus])}>
                        {STATUS_LABELS[t.status as TicketStatus]}
                      </Badge>
                      <Badge className={cn('text-xs', PRIORITY_COLORS[t.priority as Priority])}>
                        {t.priority}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        />
      </TabsContent>

      {/* ── Mantenimiento General ── */}
      <TabsContent value="general">
        <div className="flex justify-end mb-3">
          <LinkButton href="/mantenimiento/nuevo?tipo=general" size="sm">+ Nueva solicitud</LinkButton>
        </div>
        <MaintListSection items={generalTickets} empty="No tienes solicitudes de mantenimiento general." />
      </TabsContent>

      {/* ── Maquinaria ── */}
      <TabsContent value="maquinaria">
        <div className="flex justify-end mb-3">
          <LinkButton href="/mantenimiento/nuevo?tipo=maquinaria" size="sm">+ Nueva solicitud</LinkButton>
        </div>
        <MaintListSection items={maqTickets} empty="No tienes solicitudes de maquinaria." />
      </TabsContent>
    </Tabs>
  )
}

function TicketListSection<T>({
  items, empty, renderItem,
}: {
  items: T[]
  empty: string
  renderItem: (item: T) => React.ReactNode
}) {
  if (!items.length) {
    return (
      <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
        <CardContent className="py-12 text-center">
          <Ticket className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">{empty}</p>
        </CardContent>
      </Card>
    )
  }
  return <div className="space-y-2">{items.map(renderItem)}</div>
}

function MaintListSection({ items, empty }: { items: MaintRow[]; empty: string }) {
  return (
    <TicketListSection
      items={items}
      empty={empty}
      renderItem={(t) => (
        <Link key={t.id} href={`/mantenimiento/${t.id}`}>
          <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                    <span className="text-sm font-semibold truncate">{t.servicio}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{t.descripcion}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Encargado: {t.encargado_nombre} · {formatDate(t.created_at)}
                  </p>
                </div>
                <Badge className={cn('text-xs flex-shrink-0', MAINTENANCE_STATUS_COLORS[t.status as MaintenanceStatus])}>
                  {MAINTENANCE_STATUS_LABELS[t.status as MaintenanceStatus]}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  )
}
