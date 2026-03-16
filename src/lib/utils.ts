import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, differenceInMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null) {
  if (!date) return '—'
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

export function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}
