'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: Props) {
  const router        = useRouter()
  const supabase      = createClient()
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setPassword('')
      setLoading(false)
    }
  }, [isOpen])

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const isInvalidEmail = useMemo(() => {
    if (email === '') return false
    return !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email)
  }, [email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Por favor, completa todos los campos'); return }
    if (isInvalidEmail) { toast.error('Por favor, ingresa un correo electrónico válido'); return }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credenciales incorrectas. Verifica tu correo y contraseña.')
      setLoading(false)
      return
    }
    toast.success('Inicio de sesión exitoso')
    onClose()
    router.refresh()
    router.push('/dashboard')
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Card */}
      <div className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${dark ? 'bg-[#18181b]' : 'bg-white'}`}>
        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="px-6 pt-6 pb-1">
            <h2 className={`text-xl font-bold ${dark ? 'text-white' : 'text-zinc-900'}`}>Inicio de sesión</h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4 flex flex-col gap-3">

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-medium px-1 ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Correo <span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-3 transition-colors ${
                dark
                  ? isInvalidEmail ? 'bg-zinc-800 border-red-500' : 'bg-zinc-800 border-zinc-700 focus-within:border-white'
                  : isInvalidEmail ? 'bg-zinc-50 border-red-500' : 'bg-zinc-50 border-zinc-300 focus-within:border-zinc-900'
              }`}>
                <input
                  type="email"
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo"
                  className={`flex-1 bg-transparent text-base outline-none ${dark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
                />
                <Mail className={`h-5 w-5 flex-shrink-0 ${dark ? 'text-zinc-400' : 'text-zinc-400'}`} />
              </div>
              {isInvalidEmail && (
                <p className="text-xs text-red-500 px-1">Por favor, ingrese un correo electrónico válido</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1">
              <label className={`text-xs font-medium px-1 ${dark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-3 transition-colors ${
                dark
                  ? 'bg-zinc-800 border-zinc-700 focus-within:border-white'
                  : 'bg-zinc-50 border-zinc-300 focus-within:border-zinc-900'
              }`}>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className={`flex-1 bg-transparent text-base outline-none ${dark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
                />
                <Lock className={`h-5 w-5 flex-shrink-0 ${dark ? 'text-zinc-400' : 'text-zinc-400'}`} />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-red-500 hover:text-red-400 font-medium px-3 py-2 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 font-semibold text-sm px-5 py-2 rounded-xl transition-colors disabled:opacity-70 ${
                dark ? 'bg-white text-zinc-900 hover:bg-zinc-100' : 'bg-zinc-900 text-white hover:bg-zinc-700'
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Iniciar sesión
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  )
}
