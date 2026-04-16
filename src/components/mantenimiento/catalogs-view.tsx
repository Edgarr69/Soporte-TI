'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  createArea, updateArea, deleteArea,
  createMaintenanceCategory, updateMaintenanceCategory,
  setDepartmentManager, setDepartmentAllowedTypes,
} from '@/actions/catalogs'
import { toast } from 'sonner'
import { Plus, Pencil, Check, X, Trash2, HardHat, Wrench } from 'lucide-react'

interface Area       { id: string; name: string; is_active: boolean; sort_order: number }
interface Category   { id: string; name: string; type: string; is_active: boolean }
interface Department { id: string; name: string; allowed_ticket_types?: string[] | null }
interface Manager    { id: string; department_id: string; manager_name: string; is_default: boolean }

interface Props {
  areas:       Area[]
  generalCats: Category[]
  maqCats:     Category[]
  departments: Department[]
  managers:    Manager[]
}

export function CatalogsView({ areas, generalCats, maqCats, departments, managers }: Props) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Catálogos</h1>
      <Tabs defaultValue="areas">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="areas">Áreas</TabsTrigger>
          <TabsTrigger value="cats-general">Categorías General</TabsTrigger>
          <TabsTrigger value="cats-maq">Categorías Maquinaria</TabsTrigger>
          <TabsTrigger value="managers">Encargados</TabsTrigger>
          <TabsTrigger value="restrictions">Restricciones</TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-4">
          <AreasPanel areas={areas} onSaved={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="cats-general" className="mt-4">
          <CatsPanel type="general" cats={generalCats} onSaved={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="cats-maq" className="mt-4">
          <CatsPanel type="maquinaria" cats={maqCats} onSaved={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="managers" className="mt-4">
          <ManagersPanel departments={departments} managers={managers} onSaved={() => router.refresh()} />
        </TabsContent>
        <TabsContent value="restrictions" className="mt-4">
          <DeptRestrictionsPanel departments={departments} onSaved={() => router.refresh()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Áreas ────────────────────────────────────────────────

function AreasPanel({ areas, onSaved }: { areas: Area[]; onSaved: () => void }) {
  const [newName,  setNewName]  = useState('')
  const [adding,   setAdding]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    const r = await createArea(newName)
    setAdding(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Área creada')
    setNewName('')
    onSaved()
  }

  async function saveEdit(id: string, is_active: boolean) {
    const r = await updateArea(id, editName, is_active)
    if (r.error) { toast.error(r.error); return }
    toast.success('Área actualizada')
    setEditId(null)
    onSaved()
  }

  async function toggleActive(area: Area) {
    const r = await updateArea(area.id, area.name, !area.is_active)
    if (r.error) { toast.error(r.error); return }
    onSaved()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar esta área? Asegúrate de que no esté en uso.')) return
    const r = await deleteArea(id)
    if (r.error) { toast.error(r.error); return }
    toast.success('Área eliminada')
    onSaved()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Áreas ({areas.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nueva área…"
            disabled={adding}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button size="sm" onClick={add} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          {areas.map((a) => (
            <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
              {editId === a.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-7 text-sm"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(a.id, a.is_active)}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', !a.is_active && 'line-through text-zinc-400')}>{a.name}</span>
                  <Badge variant="outline" className={cn('text-xs', a.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                    {a.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(a.id); setEditName(a.name) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleActive(a)}>
                    {a.is_active ? <X className="h-3.5 w-3.5 text-red-500" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => remove(a.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Categorías ───────────────────────────────────────────

function CatsPanel({
  type, cats, onSaved,
}: {
  type: 'general' | 'maquinaria'
  cats: Category[]
  onSaved: () => void
}) {
  const [newName, setNewName] = useState('')
  const [adding,  setAdding]  = useState(false)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [editName,setEditName]= useState('')

  async function add() {
    if (!newName.trim()) return
    setAdding(true)
    const r = await createMaintenanceCategory(newName, type)
    setAdding(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría creada')
    setNewName('')
    onSaved()
  }

  async function saveEdit(id: string, is_active: boolean) {
    const r = await updateMaintenanceCategory(id, editName, is_active)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría actualizada')
    setEditId(null)
    onSaved()
  }

  async function toggle(cat: Category) {
    const r = await updateMaintenanceCategory(cat.id, cat.name, !cat.is_active)
    if (r.error) { toast.error(r.error); return }
    onSaved()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Categorías {type === 'general' ? 'General' : 'Maquinaria'} ({cats.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nueva categoría…"
            disabled={adding}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <Button size="sm" onClick={add} disabled={adding || !newName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-7 text-sm" autoFocus />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(c.id, c.is_active)}>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', !c.is_active && 'line-through text-zinc-400')}>{c.name}</span>
                  <Badge variant="outline" className={cn('text-xs', c.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                    {c.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(c.id); setEditName(c.name) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggle(c)}>
                    {c.is_active ? <X className="h-3.5 w-3.5 text-red-500" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Restricciones de ticket por departamento ────────────

function DeptRestrictionsPanel({
  departments, onSaved,
}: {
  departments: Department[]
  onSaved: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(dept: Department) {
    const current = dept.allowed_ticket_types ?? ['general', 'maquinaria']
    const hasMaq = current.includes('maquinaria')
    const next: ('general' | 'maquinaria')[] = hasMaq ? ['general'] : ['general', 'maquinaria']
    setSaving(dept.id)
    const r = await setDepartmentAllowedTypes(dept.id, next)
    setSaving(null)
    if (r.error) { toast.error(r.error); return }
    toast.success(`${dept.name}: ${next.includes('maquinaria') ? 'Maquinaria habilitada' : 'Maquinaria deshabilitada'}`)
    onSaved()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Tipos de ticket por departamento</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">
          Todos los departamentos siempre pueden crear tickets de mantenimiento general.
          Activa la opción de maquinaria solo para los departamentos que la necesiten.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {departments.map((d) => {
          const types = d.allowed_ticket_types ?? ['general', 'maquinaria']
          const hasMaq = types.includes('maquinaria')
          return (
            <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Wrench className="h-3 w-3" />
                  General
                </span>
                <Badge variant="outline" className="text-xs border-green-300 text-green-700">Siempre</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <HardHat className="h-3 w-3" />
                  Maquinaria
                </span>
                <button
                  onClick={() => toggle(d)}
                  disabled={saving === d.id}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                    hasMaq ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700',
                    saving === d.id && 'opacity-50 cursor-not-allowed',
                  )}
                  title={hasMaq ? 'Clic para deshabilitar maquinaria' : 'Clic para habilitar maquinaria'}
                >
                  <span className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                    hasMaq ? 'translate-x-4' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Encargados de departamento ───────────────────────────

function ManagersPanel({
  departments, managers, onSaved,
}: {
  departments: Department[]
  managers: Manager[]
  onSaved: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    managers.forEach((mgr) => { m[mgr.department_id] = mgr.manager_name })
    return m
  })

  async function save(deptId: string) {
    setSaving(deptId)
    await setDepartmentManager(deptId, vals[deptId] ?? '')
    setSaving(null)
    toast.success('Encargado actualizado')
    onSaved()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Encargados por departamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {departments.map((d) => (
          <div key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:w-40 sm:flex-shrink-0 text-zinc-600 dark:text-zinc-400">{d.name}</span>
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={vals[d.id] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [d.id]: e.target.value }))}
                placeholder="Nombre del encargado"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && save(d.id)}
              />
              <Button size="sm" onClick={() => save(d.id)} disabled={saving === d.id}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
