'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label:        string            // texto del botón, ej. "Eliminar ticket"
  confirmText:  string            // pregunta de confirmación
  onConfirm:    () => Promise<boolean>   // true = terminó bien (el botón se cierra)
  size?:        'sm' | 'default'
  className?:   string
}

/** Botón de eliminar con confirmación en dos pasos (sin el confirm() del navegador). */
export function ConfirmDeleteButton({ label, confirmText, onConfirm, size = 'sm', className }: Props) {
  const [asking,  setAsking]  = useState(false)
  const [working, setWorking] = useState(false)

  async function run() {
    setWorking(true)
    const ok = await onConfirm()
    setWorking(false)
    if (ok) setAsking(false)
  }

  if (!asking) {
    return (
      <Button
        type="button" size={size} variant="outline"
        className={cn('gap-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40', size === 'sm' && 'h-7 text-xs', className)}
        onClick={() => setAsking(true)}
      >
        <Trash2 className="h-3 w-3" />
        {label}
      </Button>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 dark:border-red-900/60 dark:bg-red-950/30', className)}>
      <span className="text-xs text-red-700 dark:text-red-300">{confirmText}</span>
      <Button type="button" size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={run} disabled={working}>
        {working ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí, eliminar'}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAsking(false)} disabled={working}>
        Cancelar
      </Button>
    </div>
  )
}
