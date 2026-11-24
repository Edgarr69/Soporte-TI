'use client'

// Estado abierto/cerrado del sidebar, compartido entre layouts.
// - En escritorio se recuerda en localStorage (sobrevive recargas y el
//   cambio entre /admin y /dashboard, que montan layouts distintos).
// - En móvil no se persiste: el sidebar es un overlay y siempre arranca cerrado.

const STORAGE_KEY = 'sidebar-open'
const DESKTOP_MQ  = '(min-width: 40rem)' // = breakpoint `sm` de Tailwind v4

let memory: boolean | null = null
const listeners = new Set<() => void>()

function isDesktop(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches
}

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function getSidebarOpen(): boolean {
  if (memory !== null) return memory
  return isDesktop() && readStored()
}

export function getSidebarOpenServer(): boolean {
  return false
}

export function setSidebarOpen(open: boolean) {
  memory = open
  if (isDesktop()) {
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
    } catch {
      // sin storage (modo privado, etc.) — solo queda en memoria
    }
  }
  listeners.forEach((l) => l())
}

export function toggleSidebar() {
  setSidebarOpen(!getSidebarOpen())
}

export function subscribeSidebar(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
