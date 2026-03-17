'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createMaintenanceTicket } from '@/actions/maintenance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Wrench } from 'lucide-react'
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
  const [fechaTermino,     setFechaTermino]     = useState('')
  const [loading, setLoading] = useState(false)

  const tipoLabel = tipo === 'general' ? 'Mantenimiento General' : 'Mantenimiento de Maquinaria'

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
    if (fechaTermino && fechaTermino < fechaSolicitud) {
      toast.error('La fecha de término no puede ser anterior a la fecha de solicitud.')
      return
    }

    setLoading(true)
    const result = await createMaintenanceTicket({
      type:                     tipo,
      department_id:            deptId,
      department_name_snapshot: deptName,
      area_id:                  areaId,
      area_name_snapshot:       areaName,
      encargado_nombre:         encargado.trim(),
      category_id:              catId,
      servicio:                 servicio.trim(),
      descripcion:              descripcion.trim(),
      fecha_solicitud:          fechaSolicitud,
      fecha_termino_estimada:   fechaTermino || '',
    })

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
            <div className="space-y-1.5">
              <Label htmlFor="fechaTermino">Fecha de término estimada</Label>
              <Input
                id="fechaTermino"
                type="date"
                value={fechaTermino}
                min={fechaSolicitud}
                onChange={(e) => setFechaTermino(e.target.value)}
                disabled={loading}
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
