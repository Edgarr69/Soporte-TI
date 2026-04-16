'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMaintenanceTicket } from '@/actions/maintenance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Wrench, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { MaintenanceType } from '@/lib/types'

interface Props {
  tipo: MaintenanceType
  profile: {
    department_id:  string | null
    department_name: string | null
    area_id:        string | null
    area_name:      string | null
    encargado_nombre: string | null
  }
  departments: { id: string; name: string }[]
  areas:        { id: string; name: string }[]
  categories:   { id: string; name: string }[]
}

export function MaintenanceForm({ tipo, profile, departments, areas, categories }: Props) {
  const router = useRouter()
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Pre-populate from profile
  const [deptId,    setDeptId]    = useState(profile.department_id ?? '')
  const [deptName,  setDeptName]  = useState(profile.department_name ?? '')
  const [areaId,    setAreaId]    = useState(profile.area_id ?? '')
  const [areaName,  setAreaName]  = useState(profile.area_name ?? '')
  const [encargado, setEncargado] = useState(profile.encargado_nombre ?? '')
  const [catId,     setCatId]     = useState('')
  const [servicio,  setServicio]  = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaSolicitud,   setFechaSolicitud]   = useState(todayISO())
  const [photoFile,    setPhotoFile]    = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const tipoLabel = tipo === 'general' ? 'Mantenimiento General' : 'Mantenimiento de Maquinaria'

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!deptId || !areaId || !encargado.trim() || !servicio.trim() || !descripcion.trim()) {
      toast.error('Completa todos los campos obligatorios.')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    if (fechaSolicitud < today) {
      toast.error('La fecha de solicitud no puede ser anterior a hoy.')
      return
    }
    setLoading(true)
    const fd = new FormData()
    fd.set('type',                     tipo)
    fd.set('department_id',            deptId)
    fd.set('department_name_snapshot', deptName)
    fd.set('area_id',                  areaId)
    fd.set('area_name_snapshot',       areaName)
    fd.set('encargado_nombre',         encargado.trim())
    fd.set('category_id',              catId)
    fd.set('servicio',                 servicio.trim())
    fd.set('descripcion',              descripcion.trim())
    fd.set('fecha_solicitud',          fechaSolicitud)
    if (photoFile) fd.set('photo', photoFile)

    const result = await createMaintenanceTicket(fd)

    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }

    toast.success(`Solicitud ${result.ticket?.folio} creada correctamente.`)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Datos generales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Departamento *</Label>
              <Select
                value={deptId}
                onValueChange={(v) => {
                  if (!v) return
                  setDeptId(v)
                  const d = departments.find((d) => d.id === v)
                  setDeptName(d?.name ?? '')
                }}
                disabled={loading || !!profile.department_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona departamento">
                    {deptName || undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {profile.department_id && (
                <p className="text-xs text-zinc-400">Definido por tu perfil</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Área afectada *</Label>
              <Select
                value={areaId}
                onValueChange={(v) => {
                  if (!v) return
                  setAreaId(v)
                  const a = areas.find((a) => a.id === v)
                  setAreaName(a?.name ?? '')
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona área">
                    {areaName || undefined}
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
            <Label htmlFor="encargado">Encargado del departamento *</Label>
            <Input
              id="encargado"
              value={encargado}
              onChange={(e) => setEncargado(e.target.value)}
              placeholder="Nombre del encargado"
              disabled={loading}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fechaSolicitud">Fecha de solicitud *</Label>
              <Input
                id="fechaSolicitud"
                type="date"
                value={fechaSolicitud}
                min={todayISO()}
                onChange={(e) => setFechaSolicitud(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servicio solicitado */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Servicio solicitado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select
                value={catId}
                onValueChange={(v) => v && setCatId(v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría (opcional)">
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
          )}

          <div className="space-y-1.5">
            <Label htmlFor="servicio">Servicio requerido *</Label>
            <Input
              id="servicio"
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              placeholder="Ej. Reparación de fuga de agua, Mantenimiento preventivo..."
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion">Descripción detallada *</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el problema o servicio requerido con el mayor detalle posible..."
              rows={4}
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
          <CardDescription className="text-xs">Opcional — se incluirá en el PDF de la solicitud</CardDescription>
        </CardHeader>
        <CardContent>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Vista previa"
                className="w-full max-h-48 object-contain rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={removePhoto}
                disabled={loading}
                className="absolute top-1.5 right-1.5 rounded-full bg-zinc-900/70 p-1 text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 cursor-pointer rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
              <ImagePlus className="h-7 w-7 text-zinc-400" />
              <span className="text-sm text-zinc-500">Seleccionar imagen</span>
              <span className="text-xs text-zinc-400">JPG, PNG, WEBP</span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={loading}
                onChange={handlePhotoChange}
              />
            </label>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !deptId || !areaId || !encargado.trim() || !servicio.trim() || !descripcion.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando solicitud…
          </>
        ) : (
          <>
            <Wrench className="h-4 w-4 mr-2" />
            Enviar solicitud
          </>
        )}
      </Button>
    </form>
  )
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}
