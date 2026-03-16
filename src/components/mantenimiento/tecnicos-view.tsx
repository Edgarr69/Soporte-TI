'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { createUser, deleteUser } from '@/actions/users'
import { toast } from 'sonner'
import { UserPlus, Trash2, Wrench } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Tecnico {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

interface Props {
  tecnicos: Tecnico[]
}

export function TecnicosView({ tecnicos }: Props) {
  const router   = useRouter()
  const [showForm, setShowForm]   = useState(false)
  const [toDelete, setToDelete]   = useState<Tecnico | null>(null)
  const [deleting, setDeleting]   = useState(false)

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const r = await deleteUser(toDelete.id)
    setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(`Técnico ${toDelete.full_name ?? toDelete.email} eliminado`)
    setToDelete(null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Técnicos de Mantenimiento
            <span className="ml-2 text-sm font-normal text-zinc-400">({tecnicos.length})</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Gestiona el personal técnico que recibe asignaciones de mantenimiento
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Nuevo técnico
        </Button>
      </div>

      {showForm && (
        <CreateTecnicoForm
          onCreated={() => { setShowForm(false); router.refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {tecnicos.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <Wrench className="h-8 w-8 text-zinc-300" />
            <p className="text-sm text-zinc-500">No hay técnicos registrados.</p>
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Agregar primer técnico
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tecnicos.map((t) => (
          <Card key={t.id} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t.full_name ?? '(sin nombre)'}
                    </span>
                    <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      Técnico
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.email}</p>
                  <p className="text-xs text-zinc-400">Registrado {formatDate(t.created_at)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-950/20 flex-shrink-0"
                  onClick={() => setToDelete(t)}
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inline confirm delete */}
      {toDelete && (
        <Card className="border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              ¿Eliminar a <span className="font-bold">{toDelete.full_name ?? toDelete.email}</span>?
            </p>
            <p className="text-xs text-zinc-500">
              Esta acción no se puede deshacer. Los tickets asignados conservarán el nombre como referencia.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Formulario crear técnico ─────────────────────────────

function CreateTecnicoForm({
  onCreated, onCancel,
}: {
  onCreated: () => void
  onCancel:  () => void
}) {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [fullName,   setFullName]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setSubmitting(true)
    const r = await createUser({
      email:    email.trim(),
      password,
      full_name: fullName || undefined,
      role:     'tecnico_mantenimiento',
    })
    setSubmitting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Técnico creado')
    onCreated()
  }

  return (
    <Card className="border-zinc-300 dark:border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Nuevo técnico de mantenimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tec-nombre">Nombre completo</Label>
              <Input
                id="tec-nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Juan Pérez Martínez"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tec-email">Correo electrónico *</Label>
              <Input
                id="tec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tec-pass">Contraseña inicial *</Label>
              <Input
                id="tec-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            El técnico podrá cambiar su contraseña al iniciar sesión por primera vez.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !email.trim() || !password.trim()}>
              {submitting ? 'Creando…' : 'Crear técnico'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
