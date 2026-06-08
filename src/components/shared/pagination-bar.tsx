'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

interface Props {
  page: number
  totalPages: number
}

export function PaginationBar({ page, totalPages }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  function hrefForPage(p: number) {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('page', String(p))
    return `${pathname}?${sp.toString()}`
  }

  const atStart = page <= 1
  const atEnd   = page >= totalPages

  return (
    <div className="flex items-center justify-between pt-2">
      <PageLink href={hrefForPage(page - 1)} disabled={atStart}>
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </PageLink>
      <span className="text-xs text-zinc-400">Página {page} de {totalPages}</span>
      <PageLink href={hrefForPage(page + 1)} disabled={atEnd}>
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </div>
  )
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'pointer-events-none opacity-50')}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
      {children}
    </Link>
  )
}
