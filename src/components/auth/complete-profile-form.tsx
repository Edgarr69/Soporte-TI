'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, User } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  departments: { id: string; name: string }[]
  defaultManager: string          // encargado por default del departamento
  userEmail: string
  prefilled: {                    // datos precargados por admin (pueden ser vacíos)
    full_name?: string | null
    department_id?: string | null
    encargado_nombre?: string | null
  }
}

export function CompleteProfileForm({ departments, defaultManager, userEmail, prefilled }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [fullName,  setFullName]  = useState(prefilled.full_name ?? '')
  const [deptId,    setDeptId]    = useState(prefilled.department_id ?? '')
  const [encargado, setEncargado] = useState(prefilled.encargado_nombre ?? defaultManager)
  const [loading,   setLoading]   = useState(false)


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim() || !deptId || !encargado.trim()) {
      toast.error('Completa todos los campos requeridos.')
      return
    }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:            fullName.trim(),
        department_id:        deptId,
        encargado_nombre:     encargado.trim(),
        first_login_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      console.error('Profile update error:', error)
      toast.error(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    toast.success('¡Perfil completado!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-950/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User aria-hidden="true" className="h-5 w-5 text-zinc-500" />
          <CardTitle className="text-lg">Completa tu perfil</CardTitle>
        </div>
        <CardDescription>Correo: {userEmail}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo con apellidos *</Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Ej. María García López"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="select-departamento">Departamento *</Label>
            <Select
              value={deptId}
              onValueChange={(v) => { if (v !== null) setDeptId(v) }}
              disabled={loading}
            >
              <SelectTrigger id="select-departamento">
                <SelectValue placeholder="Selecciona departamento">
                  {deptId ? departments.find((d) => d.id === deptId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="encargado">
              Encargado del departamento *
              <span className="text-xs text-zinc-400 font-normal ml-1">(editable)</span>
            </Label>
            <Input
              id="encargado"
              placeholder="Nombre del encargado"
              value={encargado}
              onChange={(e) => setEncargado(e.target.value)}
              required disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !fullName.trim() || !deptId || !encargado.trim()}
          >
            {loading && <Loader2 aria-hidden="true" className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Guardando...' : 'Continuar al sistema'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
