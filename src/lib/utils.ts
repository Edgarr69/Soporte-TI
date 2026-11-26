import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null) {
  if (!date) return '—'
  // Fechas sin hora ('2026-11-23', columnas date) se interpretan como
  // medianoche UTC con new Date(); en México eso muestra el día anterior.
  // Construirlas como fecha local.
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return format(new Date(y, m - 1, d), 'dd MMM yyyy', { locale: es })
  }
  return format(new Date(date), 'dd MMM yyyy', { locale: es })
}

export function formatDateTime(date: string | Date | null) {
  if (!date) return '—'
  return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es })
}

export function formatRelative(date: string | Date | null) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function minutesToHuman(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function calcMinutes(from: string | null, to: string | null): number | null {
  if (!from || !to) return null
  return differenceInMinutes(new Date(to), new Date(from))
}

export function formatLocale(date: string | Date, fmt: string): string {
  return format(new Date(date), fmt, { locale: es })
}

export function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

/** true si el nombre es el departamento "Otro" (que pide texto libre). */
export function isOtroDepartment(name: string | null | undefined): boolean {
  return !!name && name.trim().toLowerCase() === 'otro'
}

/** Ordena departamentos alfabéticamente dejando "Otro" siempre al final. */
export function sortDepartments<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    Number(isOtroDepartment(a.name)) - Number(isOtroDepartment(b.name)) || a.name.localeCompare(b.name, 'es'),
  )
}

/** Nombre a mostrar: "Otro (texto)" si el departamento es Otro y hay texto. */
export function departmentLabel(name: string | null | undefined, other: string | null | undefined): string | null {
  if (!name) return null
  return isOtroDepartment(name) && other?.trim() ? `Otro (${other.trim()})` : name
}
