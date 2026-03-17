'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLE_LABELS, type Role } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { createUser, updateUserRole } from '@/actions/users'
import { toast } from 'sonner'
import { UserPlus, Shield } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  first_login_completed: boolean
  created_at: string
  department: { name: string } | null
}

interface Props {
  users:       UserRow[]
  departments: { id: string; name: string }[]
  currentRole: string
}

const ROLE_OPTIONS: Role[] = [
  'usuario', 'admin_sistemas', 'admin_mantenimiento', 'super_admin', 'tecnico_mantenimiento',
]

const ROLE_COLORS: Record<string, string> = {
  usuario:                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  admin_sistemas:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  admin_mantenimiento:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  super_admin:            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  tecnico_mantenimiento:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export function UsersView({ users, departments, currentRole }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  async function handleRoleChange(userId: string, newRole: Role): Promise<boolean> {
    const result = await updateUserRole(userId, newRole)
    if (result?.error) {
      toast.error(result.error)
      return false
    }
    toast.success('Rol actualizado.')
    router.refresh()
    return true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          Usuarios
          <span className="ml-2 text-sm font-normal text-zinc-400">({users.length})</span>
        </h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Nuevo usuario
        </Button>
      </div>

      {showForm && (
        <CreateUserForm
          departments={departments}
          onCreated={() => { setShowForm(false); router.refresh() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            isSuperAdmin={currentRole === 'super_admin'}
            onRoleChange={handleRoleChange}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Fila de usuario ──────────────────────────────────────

function UserRow({
  user, isSuperAdmin, onRoleChange,
}: {
  user: UserRow
  isSuperAdmin: boolean
  onRoleChange: (userId: string, newRole: Role) => Promise<boolean>
}) {
  const [editRole,     setEditRole]     = useState(false)
  const [newRole,      setNewRole]      = useState(user.role as Role)
  const [displayRole,  setDisplayRole]  = useState(user.role as Role)
  const [saving,       setSaving]       = useState(false)

  async function saveRole() {
    setSaving(true)
    const ok = await onRoleChange(user.id, newRole)
    setSaving(false)
    if (ok) {
      setDisplayRole(newRole) // actualiza badge inmediatamente sin esperar refresh
      setEditRole(false)
    }
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{user.full_name ?? '(sin nombre)'}</span>
              <Badge className={cn('text-xs', ROLE_COLORS[displayRole] ?? '')}>
                {ROLE_LABELS[displayRole] ?? displayRole}
              </Badge>
              {!user.first_login_completed && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                  Perfil incompleto
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
            <p className="text-xs text-zinc-400">
              {user.department?.name ?? '—'}
              {' · '}Creado {formatDate(user.created_at)}
            </p>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {editRole ? (
                <>
                  <Select value={newRole} onValueChange={(v) => v && setNewRole(v as Role)}>
                    <SelectTrigger className="h-7 text-xs w-44">
                      <SelectValue>{ROLE_LABELS[newRole]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-7 text-xs" onClick={saveRole} disabled={saving}>
                    {saving ? '…' : 'Guardar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditRole(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditRole(true)}>
                  <Shield className="h-3 w-3" />
                  Cambiar rol
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Formulario crear usuario ─────────────────────────────

function CreateUserForm({
  departments, onCreated, onCancel,
}: {
  departments: { id: string; name: string }[]
  onCreated:   () => void
  onCancel:    () => void
}) {
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [fullName,   setFullName]   = useState('')
  const [role,       setRole]       = useState<Role>('usuario')
  const [deptId,     setDeptId]     = useState('')
  const [encargado,  setEncargado]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setSubmitting(true)
    const r = await createUser({
      email:            email.trim(),
      password,
      full_name:        fullName || undefined,
      role,
      department_id:    deptId || undefined,
      encargado_nombre: encargado || undefined,
    })
    setSubmitting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Usuario creado')
    onCreated()
  }

  return (
    <Card className="border-zinc-300 dark:border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Nuevo usuario</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña inicial *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as Role)} disabled={submitting}>
                <SelectTrigger><SelectValue>{ROLE_LABELS[role]}</SelectValue></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Datos de perfil (opcionales — si los completas, el usuario no verá la pantalla de &quot;completar perfil&quot;)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Select value={deptId} onValueChange={(v) => v && setDeptId(v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar">
                    {deptId ? departments.find((d) => d.id === deptId)?.name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Encargado del departamento</Label>
              <Input value={encargado} onChange={(e) => setEncargado(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !email.trim() || !password.trim()}>
              {submitting ? 'Creando…' : 'Crear usuario'}
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
