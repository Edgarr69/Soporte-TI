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
  createMachineSubcategory, updateMachineSubcategory, deleteMachineSubcategory,
  setDepartmentManager, setDepartmentAllowedTypes,
} from '@/actions/catalogs'
import { toast } from 'sonner'
import { Plus, Pencil, Check, X, Trash2, HardHat, Wrench, ChevronRight } from 'lucide-react'

interface Area           { id: string; name: string; is_active: boolean; sort_order: number }
interface Category       { id: string; name: string; type: string; is_active: boolean }
interface Subcategory    { id: string; category_id: string; name: string; is_active: boolean; sort_order: number }
interface Department     { id: string; name: string; allowed_ticket_types?: string[] | null }
interface Manager        { id: string; department_id: string; manager_name: string; is_default: boolean }

interface Props {
  areas:          Area[]
  generalCats:    Category[]
  maqCats:        Category[]
  departments:    Department[]
  managers:       Manager[]
  subcategories:  Subcategory[]
}

export function CatalogsView({ areas, generalCats, maqCats, departments, managers, subcategories }: Props) {
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
          <MaqCatsPanel cats={maqCats} subcategories={subcategories} onSaved={() => router.refresh()} />
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
  const [newName,       setNewName]       = useState('')
  const [adding,        setAdding]        = useState(false)
  const [editId,        setEditId]        = useState<string | null>(null)
  const [editName,      setEditName]      = useState('')
  const [saving,        setSaving]        = useState<string | null>(null)
  const [toggling,      setToggling]      = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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
    setSaving(id)
    const r = await updateArea(id, editName, is_active)
    setSaving(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Área actualizada')
    setEditId(null)
    onSaved()
  }

  async function toggleActive(area: Area) {
    setToggling(area.id)
    const r = await updateArea(area.id, area.name, !area.is_active)
    setToggling(null)
    if (r.error) { toast.error(r.error); return }
    onSaved()
  }

  async function remove(id: string) {
    setDeleting(id)
    const r = await deleteArea(id)
    setDeleting(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Área eliminada')
    setConfirmDelete(null)
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
          <Button size="sm" onClick={add} disabled={adding || !newName.trim()} title="Agregar área">
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Guardar cambios" disabled={saving === a.id} onClick={() => saveEdit(a.id, a.is_active)}>
                    <Check className={cn('h-3.5 w-3.5 text-green-600', saving === a.id && 'animate-pulse')} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Cancelar edición" disabled={saving === a.id} onClick={() => setEditId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : confirmDelete === a.id ? (
                <>
                  <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">¿Eliminar "{a.name}"?</span>
                  <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={deleting === a.id} onClick={() => remove(a.id)}>
                    {deleting === a.id ? 'Eliminando…' : 'Sí, eliminar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDelete(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', !a.is_active && 'line-through text-zinc-400')}>{a.name}</span>
                  <Badge variant="outline" className={cn('text-xs', a.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                    {a.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar nombre" onClick={() => { setEditId(a.id); setEditName(a.name) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={a.is_active ? 'Desactivar área' : 'Activar área'} disabled={toggling === a.id} onClick={() => toggleActive(a)}>
                    {a.is_active ? <X className={cn('h-3.5 w-3.5 text-red-500', toggling === a.id && 'animate-pulse')} /> : <Check className={cn('h-3.5 w-3.5 text-green-600', toggling === a.id && 'animate-pulse')} />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" title="Eliminar área" onClick={() => setConfirmDelete(a.id)}>
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
  const [newName,  setNewName]  = useState('')
  const [adding,   setAdding]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving,   setSaving]   = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

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
    setSaving(id)
    const r = await updateMaintenanceCategory(id, editName, is_active)
    setSaving(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría actualizada')
    setEditId(null)
    onSaved()
  }

  async function toggle(cat: Category) {
    setToggling(cat.id)
    const r = await updateMaintenanceCategory(cat.id, cat.name, !cat.is_active)
    setToggling(null)
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
          <Button size="sm" onClick={add} disabled={adding || !newName.trim()} title="Agregar categoría">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-7 text-sm" autoFocus />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Guardar cambios" disabled={saving === c.id} onClick={() => saveEdit(c.id, c.is_active)}>
                    <Check className={cn('h-3.5 w-3.5 text-green-600', saving === c.id && 'animate-pulse')} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Cancelar edición" disabled={saving === c.id} onClick={() => setEditId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', !c.is_active && 'line-through text-zinc-400')}>{c.name}</span>
                  <Badge variant="outline" className={cn('text-xs', c.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                    {c.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar nombre" onClick={() => { setEditId(c.id); setEditName(c.name) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={c.is_active ? 'Desactivar categoría' : 'Activar categoría'} disabled={toggling === c.id} onClick={() => toggle(c)}>
                    {c.is_active ? <X className={cn('h-3.5 w-3.5 text-red-500', toggling === c.id && 'animate-pulse')} /> : <Check className={cn('h-3.5 w-3.5 text-green-600', toggling === c.id && 'animate-pulse')} />}
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

// ─── Categorías Maquinaria con subcategorías ─────────────

function MaqCatsPanel({
  cats, subcategories, onSaved,
}: {
  cats:           Category[]
  subcategories:  Subcategory[]
  onSaved:        () => void
}) {
  const [newCatName,  setNewCatName]  = useState('')
  const [addingCat,   setAddingCat]   = useState(false)
  const [editCatId,   setEditCatId]   = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  // subcategory add state per-category
  const [newSubName,  setNewSubName]  = useState<Record<string, string>>({})
  const [addingSub,   setAddingSub]   = useState<string | null>(null)
  const [editSubId,   setEditSubId]   = useState<string | null>(null)
  const [editSubName, setEditSubName] = useState('')
  const [savingCat,        setSavingCat]        = useState<string | null>(null)
  const [togglingCat,      setTogglingCat]      = useState<string | null>(null)
  const [savingSub,        setSavingSub]        = useState<string | null>(null)
  const [togglingSub,      setTogglingSub]      = useState<string | null>(null)
  const [deletingSub,      setDeletingSub]      = useState<string | null>(null)
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null)

  async function addCat() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const r = await createMaintenanceCategory(newCatName, 'maquinaria')
    setAddingCat(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría creada')
    setNewCatName('')
    onSaved()
  }

  async function saveCatEdit(id: string, is_active: boolean) {
    setSavingCat(id)
    const r = await updateMaintenanceCategory(id, editCatName, is_active)
    setSavingCat(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Categoría actualizada')
    setEditCatId(null)
    onSaved()
  }

  async function toggleCat(cat: Category) {
    setTogglingCat(cat.id)
    const r = await updateMaintenanceCategory(cat.id, cat.name, !cat.is_active)
    setTogglingCat(null)
    if (r.error) { toast.error(r.error); return }
    onSaved()
  }

  async function addSub(categoryId: string) {
    const name = (newSubName[categoryId] ?? '').trim()
    if (!name) return
    setAddingSub(categoryId)
    const r = await createMachineSubcategory(categoryId, name)
    setAddingSub(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Subcategoría creada')
    setNewSubName((prev) => ({ ...prev, [categoryId]: '' }))
    onSaved()
  }

  async function saveSubEdit(id: string, is_active: boolean) {
    setSavingSub(id)
    const r = await updateMachineSubcategory(id, editSubName, is_active)
    setSavingSub(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Subcategoría actualizada')
    setEditSubId(null)
    onSaved()
  }

  async function toggleSub(sub: Subcategory) {
    setTogglingSub(sub.id)
    const r = await updateMachineSubcategory(sub.id, sub.name, !sub.is_active)
    setTogglingSub(null)
    if (r.error) { toast.error(r.error); return }
    onSaved()
  }

  async function removeSub(id: string) {
    setDeletingSub(id)
    const r = await deleteMachineSubcategory(id)
    setDeletingSub(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Subcategoría eliminada')
    setConfirmDeleteSub(null)
    onSaved()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Categorías Maquinaria ({cats.length})</CardTitle>
        <p className="text-xs text-zinc-500 mt-1">Expande cada categoría para gestionar sus subcategorías.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Agregar categoría */}
        <div className="flex gap-2">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nueva categoría de maquinaria…"
            disabled={addingCat}
            onKeyDown={(e) => e.key === 'Enter' && addCat()}
          />
          <Button size="sm" onClick={addCat} disabled={addingCat || !newCatName.trim()} title="Agregar categoría">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Lista de categorías */}
        <div className="space-y-2">
          {cats.map((cat) => {
            const subs = subcategories.filter((s) => s.category_id === cat.id)
            const isExpanded = expandedCat === cat.id

            return (
              <div key={cat.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Fila categoría */}
                <div className="flex items-center gap-2 p-2 bg-zinc-50/70 dark:bg-zinc-900/50">
                  {editCatId === cat.id ? (
                    <>
                      <Input
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="flex-1 h-7 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Guardar cambios" disabled={savingCat === cat.id} onClick={() => saveCatEdit(cat.id, cat.is_active)}>
                        <Check className={cn('h-3.5 w-3.5 text-green-600', savingCat === cat.id && 'animate-pulse')} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Cancelar edición" disabled={savingCat === cat.id} onClick={() => setEditCatId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                        title={isExpanded ? 'Colapsar subcategorías' : 'Ver subcategorías'}
                        onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      >
                        <ChevronRight className={cn('h-3.5 w-3.5 text-zinc-400 flex-shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                        <span className={cn('text-sm font-medium truncate', !cat.is_active && 'line-through text-zinc-400')}>
                          {cat.name}
                        </span>
                        <span className="text-xs text-zinc-400 flex-shrink-0">({subs.length})</span>
                      </button>
                      <Badge variant="outline" className={cn('text-xs flex-shrink-0', cat.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                        {cat.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar nombre" onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={cat.is_active ? 'Desactivar categoría' : 'Activar categoría'} disabled={togglingCat === cat.id} onClick={() => toggleCat(cat)}>
                        {cat.is_active ? <X className={cn('h-3.5 w-3.5 text-red-500', togglingCat === cat.id && 'animate-pulse')} /> : <Check className={cn('h-3.5 w-3.5 text-green-600', togglingCat === cat.id && 'animate-pulse')} />}
                      </Button>
                    </>
                  )}
                </div>

                {/* Panel de subcategorías (colapsable) */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-2 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800">
                    {subs.length === 0 && (
                      <p className="text-xs text-zinc-400">Sin subcategorías aún.</p>
                    )}
                    {subs.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 pl-5 p-1.5 rounded-md border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                        {editSubId === sub.id ? (
                          <>
                            <Input
                              value={editSubName}
                              onChange={(e) => setEditSubName(e.target.value)}
                              className="flex-1 h-7 text-sm"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Guardar cambios" disabled={savingSub === sub.id} onClick={() => saveSubEdit(sub.id, sub.is_active)}>
                              <Check className={cn('h-3.5 w-3.5 text-green-600', savingSub === sub.id && 'animate-pulse')} />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Cancelar edición" disabled={savingSub === sub.id} onClick={() => setEditSubId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : confirmDeleteSub === sub.id ? (
                          <>
                            <span className="flex-1 text-xs text-red-600 dark:text-red-400 font-medium">¿Eliminar "{sub.name}"?</span>
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" disabled={deletingSub === sub.id} onClick={() => removeSub(sub.id)}>
                              {deletingSub === sub.id ? 'Eliminando…' : 'Sí, eliminar'}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteSub(null)}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className={cn('flex-1 text-sm', !sub.is_active && 'line-through text-zinc-400')}>{sub.name}</span>
                            <Badge variant="outline" className={cn('text-xs', sub.is_active ? 'border-green-300 text-green-700' : 'border-zinc-300 text-zinc-500')}>
                              {sub.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Editar nombre" onClick={() => { setEditSubId(sub.id); setEditSubName(sub.name) }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={sub.is_active ? 'Desactivar subcategoría' : 'Activar subcategoría'} disabled={togglingSub === sub.id} onClick={() => toggleSub(sub)}>
                              {sub.is_active ? <X className={cn('h-3.5 w-3.5 text-red-500', togglingSub === sub.id && 'animate-pulse')} /> : <Check className={cn('h-3.5 w-3.5 text-green-600', togglingSub === sub.id && 'animate-pulse')} />}
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              title="Eliminar subcategoría"
                              onClick={() => setConfirmDeleteSub(sub.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Agregar subcategoría */}
                    <div className="flex gap-2 pl-5 pt-1">
                      <Input
                        value={newSubName[cat.id] ?? ''}
                        onChange={(e) => setNewSubName((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                        placeholder="Nueva subcategoría…"
                        className="h-7 text-sm"
                        disabled={addingSub === cat.id}
                        onKeyDown={(e) => e.key === 'Enter' && addSub(cat.id)}
                      />
                      <Button
                        size="sm"
                        className="h-7"
                        title="Agregar subcategoría"
                        onClick={() => addSub(cat.id)}
                        disabled={addingSub === cat.id || !(newSubName[cat.id] ?? '').trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
  const [localDepts, setLocalDepts] = useState(departments)

  async function toggle(dept: Department) {
    const current = localDepts.find((d) => d.id === dept.id)?.allowed_ticket_types ?? ['general', 'maquinaria']
    const hasMaq = current.includes('maquinaria')
    const next: ('general' | 'maquinaria')[] = hasMaq ? ['general'] : ['general', 'maquinaria']

    // Actualización optimista inmediata
    setLocalDepts((prev) => prev.map((d) => d.id === dept.id ? { ...d, allowed_ticket_types: next } : d))

    setSaving(dept.id)
    const r = await setDepartmentAllowedTypes(dept.id, next)
    setSaving(null)
    if (r.error) {
      // Revertir si falla
      setLocalDepts(departments)
      toast.error(r.error)
      return
    }
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
        {localDepts.map((d) => {
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
