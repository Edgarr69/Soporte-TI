'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  createSeguridadCategory, updateSeguridadCategory, deleteSeguridadCategory,
} from '@/actions/seguridad'
import { toast } from 'sonner'
import { Plus, Pencil, Check, X, Trash2 } from 'lucide-react'

interface Category { id: string; name: string; is_active: boolean; sort_order: number }

export function SeguridadCatalogsView({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [newName,       setNewName]       = useState('')
  const [adding,        setAdding]        = useState(false)
  const [editId,        setEditId]        = useState<string | null>(null)
  const [editName,      setEditName]      = useState('')
  const [busy,          setBusy]          = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    const r = await createSeguridadCategory(newName)
    setAdding(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría creada')
    setNewName('')
    router.refresh()
  }

  async function saveEdit(c: Category) {
    setBusy(c.id)
    const r = await updateSeguridadCategory(c.id, editName, c.is_active)
    setBusy(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría actualizada')
    setEditId(null)
    router.refresh()
  }

  async function toggle(c: Category) {
    setBusy(c.id)
    const r = await updateSeguridadCategory(c.id, c.name, !c.is_active)
    setBusy(null)
    if (r.error) { toast.error(r.error); return }
    router.refresh()
  }

  async function remove(c: Category) {
    setBusy(c.id)
    const r = await deleteSeguridadCategory(c.id)
    setBusy(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría eliminada')
    setConfirmDelete(null)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Catálogos</h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Categorías de reporte ({categories.length})</CardTitle>
          <CardDescription className="text-xs">
            Lo que el usuario elige al reportar. Desactiva una categoría para ocultarla sin perder el historial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Nueva categoría"
              placeholder="Nueva categoría…"
              disabled={adding}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <Button size="sm" onClick={add} disabled={adding || !newName.trim()} aria-label="Agregar categoría" title="Agregar categoría">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                {editId === c.id ? (
                  <>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-7 text-sm" autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Guardar cambios" title="Guardar cambios"
                      disabled={busy === c.id} onClick={() => saveEdit(c)}>
                      <Check className={cn('h-3.5 w-3.5 text-green-600', busy === c.id && 'animate-pulse')} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Cancelar edición" title="Cancelar edición"
                      disabled={busy === c.id} onClick={() => setEditId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : confirmDelete === c.id ? (
                  <>
                    <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">
                      ¿Eliminar &quot;{c.name}&quot;? Los reportes existentes conservan el nombre.
                    </span>
                    <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={busy === c.id} onClick={() => remove(c)}>
                      {busy === c.id ? 'Eliminando…' : 'Sí, eliminar'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <span className={cn('flex-1 text-sm', !c.is_active && 'line-through text-zinc-400')}>{c.name}</span>
                    <Badge variant="outline" className={cn('text-xs', c.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" aria-label="Editar nombre" title="Editar nombre"
                      onClick={() => { setEditId(c.id); setEditName(c.name) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                      aria-label={c.is_active ? 'Desactivar categoría' : 'Activar categoría'}
                      title={c.is_active ? 'Desactivar categoría' : 'Activar categoría'}
                      disabled={busy === c.id} onClick={() => toggle(c)}>
                      {c.is_active
                        ? <X className={cn('h-3.5 w-3.5 text-red-500', busy === c.id && 'animate-pulse')} />
                        : <Check className={cn('h-3.5 w-3.5 text-green-600', busy === c.id && 'animate-pulse')} />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      aria-label="Eliminar categoría" title="Eliminar categoría" onClick={() => setConfirmDelete(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-400">
        Las áreas son compartidas con Mantenimiento y se administran desde su catálogo.
      </p>
    </div>
  )
}
