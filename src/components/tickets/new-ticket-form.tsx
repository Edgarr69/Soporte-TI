'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createTicket } from '@/actions/tickets'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { type Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Category { id: string; name: string }
interface Subcategory { id: string; category_id: string; name: string }

interface Props {
  categories: Category[]
  subcategories: Subcategory[]
  profile: Profile & { department?: { name: string } }
}

const BLOCKING_OPTIONS = [
  { value: 'total',   label: 'Sí, totalmente — no puedo trabajar' },
  { value: 'partial', label: 'Sí, parcialmente — puedo trabajar con dificultad' },
  { value: 'none',    label: 'No me impide trabajar' },
]

const SCOPE_OPTIONS = [
  { value: 'single',   label: 'Solo a mí' },
  { value: 'multiple', label: 'A varias personas' },
]

export function NewTicketForm({ categories, subcategories, profile }: Props) {
  const router = useRouter()

  const [categoryId,    setCategoryId]    = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [description,   setDescription]   = useState('')
  const [blocking,      setBlocking]      = useState<'total' | 'partial' | 'none' | ''>('')
  const [scope,         setScope]         = useState<'single' | 'multiple' | ''>('')
  const [workaround,    setWorkaround]    = useState<'yes' | 'no' | ''>('')
  const [loading,       setLoading]       = useState(false)

  // Subcategorías filtradas según categoría
  const filteredSubs = useMemo(
    () => subcategories.filter((s) => s.category_id === categoryId),
    [categoryId, subcategories]
  )
  const hasSubcategories = filteredSubs.length > 0


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || (hasSubcategories && !subcategoryId) || !description.trim() || !blocking || !scope || !workaround) {
      toast.error('Completa todos los campos requeridos.')
      return
    }
    if (description.trim().length < 30) {
      toast.error('La descripción debe tener al menos 30 caracteres.')
      return
    }
    setLoading(true)

    const result = await createTicket({
      category_id:    categoryId,
      subcategory_id: subcategoryId,
      description:    description.trim(),
      blocking_level: blocking as 'total' | 'partial' | 'none',
      affected_scope: scope as 'single' | 'multiple',
      has_workaround: workaround === 'yes',
    })

    if (result.error) {
      toast.error('Error al crear el ticket: ' + result.error)
      setLoading(false)
      return
    }

    toast.success(`Ticket ${result.ticket?.folio} creado correctamente.`)
    router.push('/dashboard')
  }

  const isValid = categoryId && (!hasSubcategories || subcategoryId) && description.trim().length >= 30
    && blocking && scope && workaround

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos del usuario (solo lectura) */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-500">Tu información</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
          <div>
            <p className="text-xs text-zinc-400">Nombre</p>
            <p className="text-sm font-medium">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Departamento</p>
            <p className="text-sm font-medium">{profile.department?.name ?? '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Categoría y subcategoría */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tipo de problema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="select-categoria">Categoría *</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => { if (v !== null) { setCategoryId(v); setSubcategoryId('') } }}
              disabled={loading}
            >
              <SelectTrigger id="select-categoria">
                <SelectValue placeholder="Selecciona una categoría">
                  {categoryId ? categories.find((c) => c.id === categoryId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {categoryId && hasSubcategories && (
            <div className="space-y-1.5">
              <Label htmlFor="select-subcategoria">Subcategoría *</Label>
              <Select
                value={subcategoryId}
                onValueChange={(v) => v !== null && setSubcategoryId(v)}
                disabled={loading}
              >
                <SelectTrigger id="select-subcategoria">
                  <SelectValue placeholder="Selecciona una subcategoría">
                    {subcategoryId ? filteredSubs.find((s) => s.id === subcategoryId)?.name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredSubs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Descripción del problema</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Textarea
            id="descripcion"
            name="descripcion"
            aria-describedby="descripcion-hint descripcion-contador"
            placeholder="Describe detalladamente qué sucede, desde cuándo ocurre, qué mensajes de error aparecen, qué acciones tomaste y cualquier otro detalle relevante..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            disabled={loading}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <div id="descripcion-hint" className="flex items-center gap-1 text-xs text-zinc-400">
              <Info aria-hidden="true" className="h-3 w-3" />
              <span>Mínimo 30 caracteres. Sé lo más específico posible.</span>
            </div>
            <span
              id="descripcion-contador"
              aria-live="polite"
              className={cn('text-xs', description.length < 30 ? 'text-red-500' : 'text-zinc-400')}
            >
              {description.length} / 30 mín.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preguntas de impacto */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Impacto del problema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="space-y-1.5">
            <Label htmlFor="select-bloqueo">¿El problema te impide trabajar? *</Label>
            <Select
              value={blocking}
              onValueChange={(v) => v !== null && setBlocking(v as typeof blocking)}
              disabled={loading}
            >
              <SelectTrigger id="select-bloqueo">
                <SelectValue placeholder="Selecciona una opción">
                  {blocking ? BLOCKING_OPTIONS.find((o) => o.value === blocking)?.label : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BLOCKING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="select-alcance">¿A quién afecta el problema? *</Label>
            <Select
              value={scope}
              onValueChange={(v) => v !== null && setScope(v as typeof scope)}
              disabled={loading}
            >
              <SelectTrigger id="select-alcance">
                <SelectValue placeholder="Selecciona una opción">
                  {scope ? SCOPE_OPTIONS.find((o) => o.value === scope)?.label : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="select-alternativa">¿Tienes alguna alternativa temporal para seguir trabajando? *</Label>
            <Select
              value={workaround}
              onValueChange={(v) => v !== null && setWorkaround(v as typeof workaround)}
              disabled={loading}
            >
              <SelectTrigger id="select-alternativa">
                <SelectValue placeholder="Selecciona una opción">
                  {workaround === 'yes' ? 'Sí, tengo una alternativa' : workaround === 'no' ? 'No, no tengo alternativa' : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Sí, tengo una alternativa</SelectItem>
                <SelectItem value="no">No, no tengo alternativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={!isValid || loading}>
          {loading && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? 'Enviando...' : 'Enviar ticket'}
        </Button>
      </div>
    </form>
  )
}
