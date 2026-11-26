'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LinkButton } from '@/components/ui/link-button'
import { ROLE_LABELS, type Role } from '@/lib/types'
import { cn, formatDate, isOtroDepartment, departmentLabel } from '@/lib/utils'
import { createUser, updateUserRole, updateUserPassword } from '@/actions/users'
import { toast } from 'sonner'
import { UserPlus, Shield, KeyRound } from 'lucide-react'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  first_login_completed: boolean
  created_at: string
  department: { name: string } | null
  department_other: string | null
}

interface Props {
  users:         UserRow[]
  departments:   { id: string; name: string }[]
  currentRole:   string
  currentUserId: string
  page:          number
  totalPages:    number
  totalCount:    number
}

const ROLE_OPTIONS: Role[] = [
  'usuario', 'admin_sistemas', 'admin_mantenimiento', 'admin_seguridad', 'super_admin', 'tecnico_mantenimiento',
]

const ROLE_COLORS: Record<string, string> = {
  usuario:                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  admin_sistemas:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  admin_mantenimiento:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  admin_seguridad:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  super_admin:            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  tecnico_mantenimiento:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

export function UsersView({ users, departments, currentRole, currentUserId, page, totalPages, totalCount }: Props) {
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
          <span className="ml-2 text-sm font-normal text-zinc-400">({totalCount})</span>
        </h1>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Nuevo usuario
        </Button>
      </div>

      {showForm && (
        <CreateUserForm
          departments={departments}
          currentRole={currentRole}
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
            isMantAdmin={currentRole === 'admin_mantenimiento'}
            isOwnRow={u.id === currentUserId}
            onRoleChange={handleRoleChange}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <LinkButton href={`/admin/usuarios?page=${page - 1}`} variant="outline" size="sm">
                Anterior
              </LinkButton>
            )}
            {page < totalPages && (
              <LinkButton href={`/admin/usuarios?page=${page + 1}`} variant="outline" size="sm">
                Siguiente
              </LinkButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fila de usuario ──────────────────────────────────────

function UserRow({
  user, isSuperAdmin, isMantAdmin, isOwnRow, onRoleChange,
}: {
  user:         UserRow
  isSuperAdmin: boolean
  isMantAdmin:  boolean
  isOwnRow:     boolean
  onRoleChange: (userId: string, newRole: Role) => Promise<boolean>
}) {
  const [editRole,    setEditRole]    = useState(false)
  const [displayRole, setDisplayRole] = useState(user.role as Role)
  const [saving,      setSaving]      = useState(false)
  const [editPass,    setEditPass]    = useState(false)
  const [newPass,     setNewPass]     = useState('')
  const [savingPass,  setSavingPass]  = useState(false)

  // admin_mantenimiento puede alternar entre usuario ↔ tecnico_mantenimiento
  const roleOptions: Role[] = isSuperAdmin
    ? ROLE_OPTIONS
    : ['usuario', 'tecnico_mantenimiento']

  const [newRole, setNewRole] = useState<Role>(user.role as Role)

  // No puede cambiar su propio rol; admin_mantenimiento no puede tocar a admin_sistemas
  const targetIsAdminSistemas = user.role === 'admin_sistemas'
  const canEditRole = !isOwnRow
    && (isSuperAdmin || (isMantAdmin && !targetIsAdminSistemas))

  async function saveRole() {
    setSaving(true)
    const ok = await onRoleChange(user.id, newRole)
    setSaving(false)
    if (ok) {
      setDisplayRole(newRole)
      setEditRole(false)
    }
  }

  async function savePassword() {
    if (newPass.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setSavingPass(true)
    const r = await updateUserPassword(user.id, newPass)
    setSavingPass(false)
    if (r?.error) { toast.error(r.error); return }
    toast.success('Contraseña actualizada.')
    setNewPass('')
    setEditPass(false)
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
              {departmentLabel(user.department?.name, user.department_other) ?? '—'}
              {' · '}Creado {formatDate(user.created_at)}
            </p>
          </div>

          {(canEditRole || isSuperAdmin) && (
          <div className="flex flex-col items-end gap-2">
          {canEditRole && (
            <div className="flex items-center gap-2 flex-wrap">
              {editRole ? (
                <>
                  <Select value={newRole} onValueChange={(v) => v && setNewRole(v as Role)}>
                    <SelectTrigger className="h-7 text-xs w-52">
                      <SelectValue>{ROLE_LABELS[newRole]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
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
          {isSuperAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {editPass ? (
                <>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Nueva contraseña"
                    className="h-7 text-xs w-52"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') savePassword() }}
                    disabled={savingPass}
                  />
                  <Button size="sm" className="h-7 text-xs" onClick={savePassword} disabled={savingPass || !newPass}>
                    {savingPass ? '…' : 'Guardar'}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditPass(false); setNewPass('') }} disabled={savingPass}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditPass(true)}>
                  <KeyRound className="h-3 w-3" />
                  Cambiar contraseña
                </Button>
              )}
            </div>
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
  departments, currentRole, onCreated, onCancel,
}: {
  departments: { id: string; name: string }[]
  currentRole: string
  onCreated:   () => void
  onCancel:    () => void
}) {
  const canPickRole      = currentRole === 'super_admin' || currentRole === 'admin_mantenimiento'
  const createRoleOptions: Role[] = currentRole === 'super_admin'
    ? ROLE_OPTIONS
    : ['usuario', 'tecnico_mantenimiento']
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [fullName,   setFullName]   = useState('')
  const [role,       setRole]       = useState<Role>('usuario')
  const [deptId,     setDeptId]     = useState('')
  const [encargado,  setEncargado]  = useState('')
  const [deptOther,  setDeptOther]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isOtro = isOtroDepartment(departments.find((d) => d.id === deptId)?.name)
  const missingOther = isOtro && !deptOther.trim()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || missingOther) return
    setSubmitting(true)
    const r = await createUser({
      email:            email.trim(),
      password,
      full_name:        fullName || undefined,
      role,
      department_id:    deptId || undefined,
      department_other: isOtro ? deptOther.trim() : undefined,
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
            {canPickRole && (
              <div className="space-y-1.5">
                <Label htmlFor="new-rol">Rol</Label>
                <Select value={role} onValueChange={(v) => v && setRole(v as Role)} disabled={submitting}>
                  <SelectTrigger id="new-rol"><SelectValue>{ROLE_LABELS[role]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {createRoleOptions.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400">
            Datos de perfil (opcionales — si los completas, el usuario no verá la pantalla de &quot;completar perfil&quot;)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-dept">Departamento</Label>
              <Select value={deptId} onValueChange={(v) => v && setDeptId(v)} disabled={submitting}>
                <SelectTrigger id="new-dept">
                  <SelectValue placeholder="Sin asignar">
                    {deptId ? departments.find((d) => d.id === deptId)?.name : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {isOtro && (
                <Input
                  aria-label="¿Cuál departamento?"
                  placeholder="Escribe el departamento"
                  maxLength={100}
                  value={deptOther}
                  onChange={(e) => setDeptOther(e.target.value)}
                  required disabled={submitting}
                  autoFocus
                />
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="new-encargado">Encargado del departamento</Label>
              <Input id="new-encargado" value={encargado} onChange={(e) => setEncargado(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting || !email.trim() || !password.trim() || missingOther}>
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
