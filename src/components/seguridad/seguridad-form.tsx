'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSeguridadReport } from '@/actions/seguridad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, ShieldAlert, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { compressImage } from '@/lib/image-compress'
import {
  NIVELES_RIESGO, NIVEL_RIESGO_LABELS, NIVEL_RIESGO_DESCRIPTIONS,
  type NivelRiesgo,
} from '@/lib/types'

interface Props {
  departmentName: string | null
  areas:      { id: string; name: string }[]
  categories: { id: string; name: string }[]
}

const RIESGO_STYLES: Record<NivelRiesgo, { ring: string; dot: string }> = {
  bajo:    { ring: 'border-zinc-400 bg-zinc-50 dark:bg-zinc-800/60',          dot: 'bg-zinc-400' },
  medio:   { ring: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',          dot: 'bg-blue-500' },
  alto:    { ring: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30',    dot: 'bg-orange-500' },
  critico: { ring: 'border-red-600 bg-red-50 dark:bg-red-950/30',             dot: 'bg-red-600' },
}

export function SeguridadForm({ departmentName, areas, categories }: Props) {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [catId,       setCatId]       = useState('')
  const [areaId,      setAreaId]      = useState('')
  const [riesgo,      setRiesgo]      = useState<NivelRiesgo>('medio')
  const [ubicacion,   setUbicacion]   = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [compressing, setCompressing] = useState(false)

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const original = input.files?.[0] ?? null
    if (!original) return
    setCompressing(true)
    const file = await compressImage(original)
    setCompressing(false)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no puede superar 10 MB.')
      input.value = ''
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // El botón ya no se desactiva: se dice exactamente qué falta y se lleva al
  // primer campo pendiente (en el celular no se veía qué faltaba)
  const missing = [
    !catId                         && ['seg-cat',       'la categoría'],
    !areaId                        && ['seg-area',      'el área'],
    ubicacion.trim().length < 3    && ['seg-ubicacion', 'la ubicación (mínimo 3 caracteres)'],
    descripcion.trim().length < 10 && ['seg-desc',      `la descripción (${descripcion.trim().length}/10 caracteres)`],
  ].filter(Boolean) as [string, string][]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (compressing) {
      toast.error('Espera a que termine de procesarse la imagen.')
      return
    }
    if (missing.length) {
      toast.error(`Falta completar: ${missing.map(([, l]) => l).join(', ')}.`)
      const el = document.getElementById(missing[0][0])
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }
    setLoading(true)
    const fd = new FormData()
    fd.set('category_id',  catId)
    fd.set('area_id',      areaId)
    fd.set('nivel_riesgo', riesgo)
    fd.set('ubicacion',    ubicacion.trim())
    fd.set('descripcion',  descripcion.trim())
    if (photoFile) fd.set('photo', photoFile)

    const result = await createSeguridadReport(fd)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success(`Reporte ${result.ticket?.folio} enviado correctamente.`)
    router.push('/mis-tickets?tab=seguridad')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ¿Qué ocurre? */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">¿Qué quieres reportar?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="seg-cat">Categoría *</Label>
            <Select value={catId} onValueChange={(v) => v && setCatId(v)} disabled={loading}>
              <SelectTrigger id="seg-cat">
                <SelectValue placeholder="Selecciona categoría">
                  {catId ? categories.find((c) => c.id === catId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium mb-1.5">Nivel de riesgo *</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NIVELES_RIESGO.map((n) => {
                const active = riesgo === n
                return (
                  <label
                    key={n}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-2.5 transition-colors',
                      active
                        ? RIESGO_STYLES[n].ring
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700',
                    )}
                  >
                    <input
                      type="radio"
                      name="nivel_riesgo"
                      value={n}
                      checked={active}
                      onChange={() => setRiesgo(n)}
                      disabled={loading}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', RIESGO_STYLES[n].dot)} />
                      {NIVEL_RIESGO_LABELS[n]}
                    </span>
                    <span className="block text-[11px] text-zinc-500 leading-tight mt-1">
                      {NIVEL_RIESGO_DESCRIPTIONS[n]}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* ¿Dónde? */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">¿Dónde ocurre?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="seg-dept">Tu departamento</Label>
              <Input id="seg-dept" value={departmentName ?? 'Sin departamento'} disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seg-area">Área *</Label>
              <Select value={areaId} onValueChange={(v) => v && setAreaId(v)} disabled={loading}>
                <SelectTrigger id="seg-area">
                  <SelectValue placeholder="Selecciona área">
                    {areaId ? areas.find((a) => a.id === areaId)?.name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seg-ubicacion">Ubicación exacta *</Label>
            <Input
              id="seg-ubicacion"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Ej. Pasillo junto a la línea 3, escalera de emergencia norte…"
              maxLength={200}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seg-desc">Descripción *</Label>
            <Textarea
              id="seg-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe la situación: qué viste, a quién puede afectar, desde cuándo…"
              rows={4}
              maxLength={5000}
              disabled={loading}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Fotografía */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fotografía</CardTitle>
          <CardDescription className="text-xs">Opcional, ayuda a evaluar el riesgo más rápido</CardDescription>
        </CardHeader>
        <CardContent>
          {photoPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Vista previa"
                className="w-full max-h-48 object-contain rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={removePhoto}
                disabled={loading}
                aria-label="Quitar foto"
                className="absolute top-1.5 right-1.5 rounded-full bg-zinc-900/70 p-1 text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 cursor-pointer rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
              <ImagePlus className="h-7 w-7 text-zinc-400" />
              <span className="text-sm text-zinc-500">Seleccionar imagen</span>
              <span className="text-xs text-zinc-400">
                {compressing ? 'Procesando imagen…' : 'JPG o PNG, máx. 10 MB'}
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                disabled={loading}
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando reporte…
          </>
        ) : (
          <>
            <ShieldAlert className="h-4 w-4 mr-2" />
            Enviar reporte
          </>
        )}
      </Button>
    </form>
  )
}
