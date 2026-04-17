'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Ticket, Search } from 'lucide-react'
import {
  STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS,
  type TicketStatus, type Priority,
} from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'

interface TicketRow {
  id: string; folio: string; status: string; priority: string
  description: string; is_reopened: boolean
  created_at: string
  ticket_categories: { name: string } | null
  ticket_subcategories: { name: string } | null
  user: { full_name: string; email: string } | null
  department: { name: string } | null
}

export function AdminTicketList({ tickets }: { tickets: TicketRow[] }) {
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [priority, setPriority] = useState('all')

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.folio.toLowerCase().includes(q) ||
      (t.user?.full_name ?? '').toLowerCase().includes(q) ||
      (t.user?.email ?? '').toLowerCase().includes(q) ||
      (t.department?.name ?? '').toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    const matchStatus   = status   === 'all' || t.status   === status
    const matchPriority = priority === 'all' || t.priority === priority
    return matchSearch && matchStatus && matchPriority
  })

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar por folio, usuario, departamento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => v !== null && setStatus(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado">
              {status === 'all' ? 'Todos' : STATUS_LABELS[status as TicketStatus]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => v !== null && setPriority(v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Prioridad">
              {priority === 'all' ? 'Todas' : PRIORITY_LABELS[priority as Priority]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contador */}
      <p className="text-xs text-zinc-400">
        {filtered.length} de {tickets.length} tickets
      </p>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-12 text-center">
            <Ticket className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Sin resultados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Link key={t.id} href={`/admin/sistemas/tickets/${t.id}`}>
              <Card className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-zinc-400">{t.folio}</span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {t.user?.full_name ?? t.user?.email ?? '—'}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {t.department?.name ?? 'Sin depto.'}
                        </span>
                        {t.is_reopened && (
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">
                            Reabierto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {t.ticket_categories?.name} · {t.ticket_subcategories?.name}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{t.description}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{formatDate(t.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge className={cn('text-xs', PRIORITY_COLORS[t.priority as Priority])}>
                        {PRIORITY_LABELS[t.priority as Priority]}
                      </Badge>
                      <Badge className={cn('text-xs', STATUS_COLORS[t.status as TicketStatus])}>
                        {STATUS_LABELS[t.status as TicketStatus]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
