// ============================================================
// Tipos centrales del sistema de soporte TI
// ============================================================

export type Role =
  | 'usuario'
  | 'admin_sistemas'
  | 'admin_mantenimiento'
  | 'super_admin'
  | 'tecnico_mantenimiento'

export const ROLE_LABELS: Record<Role, string> = {
  usuario:                'Usuario',
  admin_sistemas:         'Admin Sistemas',
  admin_mantenimiento:    'Admin Mantenimiento',
  super_admin:            'Super Admin',
  tecnico_mantenimiento:  'Técnico Mantenimiento',
}

export function canManageSistemas(role: Role): boolean {
  return role === 'admin_sistemas' || role === 'super_admin'
}

export function canManageMantenimiento(role: Role): boolean {
  return role === 'admin_mantenimiento' || role === 'super_admin'
}

export function isAdminAny(role: Role): boolean {
  return role !== 'usuario' && role !== 'tecnico_mantenimiento'
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case 'admin_sistemas':        return '/admin/sistemas'
    case 'admin_mantenimiento':   return '/admin/mantenimiento'
    case 'super_admin':           return '/admin'
    case 'tecnico_mantenimiento': return '/tecnico'
    default:                      return '/dashboard'
  }
}

export type TicketStatus =
  | 'abierto'
  | 'en_proceso'
  | 'en_espera'
  | 'resuelto'
  | 'cerrado'
  | 'reabierto'

export type Priority = 'baja' | 'media' | 'alta' | 'critica'

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  abierto:    ['en_proceso', 'en_espera', 'cerrado'],
  en_proceso: ['en_espera', 'resuelto', 'cerrado'],
  en_espera:  ['en_proceso', 'resuelto', 'cerrado'],
  resuelto:   ['cerrado', 'reabierto'],
  cerrado:    ['reabierto'],
  reabierto:  ['en_proceso', 'en_espera', 'resuelto', 'cerrado'],
}

export type BlockingLevel = 'total' | 'partial' | 'none'
export type AffectedScope = 'single' | 'multiple'

export type NotificationType =
  | 'ticket_created'
  | 'status_changed'
  | 'comment_added'
  | 'ticket_reopened'
  | 'assigned'

// ─── Entidades de base de datos ───────────────────────────

export interface Department {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  department_id: string | null
  role: Role
  first_login_completed: boolean
  created_at: string
  updated_at: string
  // joined (solo id+name, sin created_at, para compatibilidad con selects parciales)
  department?: { id: string; name: string }
}

export interface TicketCategory {
  id: string
  name: string
  icon: string | null
  sort_order: number
}

export interface TicketSubcategory {
  id: string
  category_id: string
  name: string
  base_score: number
  sort_order: number
}

export interface Ticket {
  id: string
  folio: string
  user_id: string
  department_id: string | null
  category_id: string
  subcategory_id: string
  description: string
  blocking_level: BlockingLevel
  affected_scope: AffectedScope
  has_workaround: boolean
  priority: Priority
  priority_score: number | null
  status: TicketStatus
  is_reopened: boolean
  reopen_count: number
  created_at: string
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  reopened_at: string | null
  updated_at: string
  first_response_time_minutes: number | null
  resolution_time_minutes: number | null
  resolution_summary: string | null
  visible_resolution_summary: string | null
  technical_notes: string | null
}

// Vista enriquecida con joins
export interface TicketFull extends Ticket {
  user_name: string
  user_email: string
  department_name: string | null
  category_name: string
  category_icon: string | null
  subcategory_name: string
}

export interface TicketStatusHistory {
  id: string
  ticket_id: string
  changed_by: string
  from_status: TicketStatus | null
  to_status: TicketStatus
  comment: string | null
  created_at: string
  // joined
  changer?: Profile
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  created_at: string
  updated_at: string
  // joined
  author?: Profile
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  ticket_id: string | null
  type: NotificationType
  module: 'sistemas' | 'mantenimiento' | null
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

// ─── Formularios ──────────────────────────────────────────

export interface NewTicketFormData {
  category_id: string
  subcategory_id: string
  description: string
  blocking_level: BlockingLevel
  affected_scope: AffectedScope
  has_workaround: boolean
  files?: File[]
}

export interface CompleteProfileFormData {
  full_name: string
  department_id: string
}

export interface AdminUpdateTicketData {
  status?: TicketStatus
  resolution_summary?: string
  visible_resolution_summary?: string
  technical_notes?: string
  comment?: string
  is_internal?: boolean
}

// ─── Métricas ─────────────────────────────────────────────

export interface TicketMetrics {
  total: number
  abierto: number
  en_proceso: number
  en_espera: number
  resuelto: number
  cerrado: number
  reabierto: number
  critica: number
  alta: number
  media: number
  baja: number
  avgFirstResponseMinutes: number | null
  avgResolutionMinutes: number | null
}

export interface CategoryMetric {
  category_name: string
  count: number
}

export interface DepartmentMetric {
  department_name: string
  count: number
}

export interface UserMetric {
  user_name: string
  user_email: string
  count: number
}

export interface MonthlyMetric {
  month: string  // "2025-01"
  count: number
}

// ─── UI helpers ───────────────────────────────────────────

export const STATUS_LABELS: Record<TicketStatus, string> = {
  abierto:    'Abierto',
  en_proceso: 'En proceso',
  en_espera:  'En espera',
  resuelto:   'Resuelto',
  cerrado:    'Cerrado',
  reabierto:  'Reabierto',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  critica: 'Crítica',
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  abierto:    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  en_espera:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  resuelto:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cerrado:    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  reabierto:  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  baja:    'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  media:   'bg-blue-500 text-white dark:bg-blue-600',
  alta:    'bg-orange-500 text-white dark:bg-orange-500',
  critica: 'bg-red-600 text-white dark:bg-red-600 font-semibold',
}

// ─────────────────────────────────────────────────────────────
// MANTENIMIENTO
// ─────────────────────────────────────────────────────────────

export type MaintenanceType = 'general' | 'maquinaria'

export type MaintenanceStatus =
  | 'pendiente'
  | 'en_revision'
  | 'asignado'
  | 'en_proceso'
  | 'terminado'
  | 'cancelado'

// Transiciones permitidas por el admin
export const MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  pendiente:  ['en_revision', 'cancelado'],
  en_revision:['asignado', 'cancelado'],
  asignado:   ['en_proceso', 'cancelado'],
  en_proceso: ['terminado', 'cancelado'],
  terminado:  ['pendiente'],
  cancelado:  ['pendiente'],
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pendiente:  'Pendiente',
  en_revision:'En revisión',
  asignado:   'Asignado',
  en_proceso: 'En proceso',
  terminado:  'Terminado',
  cancelado:  'Cancelado',
}

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  pendiente:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  en_revision:'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  asignado:   'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  terminado:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelado:  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  general:    'Mantenimiento General',
  maquinaria: 'Mantenimiento de Maquinaria',
}

// ─── Catálogos nuevos ─────────────────────────────────────

export interface Area {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DepartmentManager {
  id: string
  department_id: string
  manager_name: string
  is_default: boolean
  created_at: string
}

export interface MaintenanceCategory {
  id: string
  name: string
  type: MaintenanceType
  is_active: boolean
  sort_order: number
  created_at: string
}

// ─── Perfil extendido ─────────────────────────────────────

// El interface Profile ya tiene id, email, full_name, department_id, role, first_login_completed
// Aquí extendemos con los campos nuevos via declaración separada

export interface ProfileExtended {
  id: string
  email: string
  full_name: string | null
  department_id: string | null
  role: Role
  first_login_completed: boolean
  encargado_nombre: string | null
  created_at: string
  updated_at: string
  // joined
  department?: { id: string; name: string }
}

// ─── Ticket de mantenimiento ──────────────────────────────

export interface MaintenanceTicket {
  id: string
  folio: string
  type: MaintenanceType
  user_id: string
  department_id: string | null
  department_name_snapshot: string | null
  area_id: string | null
  area_name_snapshot: string | null
  encargado_nombre: string
  category_id: string | null
  servicio: string
  descripcion: string
  fecha_solicitud: string        // date ISO
  fecha_termino_estimada: string | null
  status: MaintenanceStatus
  tecnico_id: string | null
  tecnico_nombre_snapshot: string | null
  pdf_path: string | null
  has_photo: boolean
  photo_path: string | null
  approved_at: string | null
  approved_by: string | null
  assigned_at: string | null
  started_at: string | null
  finished_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  prioridad: 'baja' | 'normal' | 'alta'
  assignment_time_minutes: number | null
  resolution_time_minutes: number | null
  created_at: string
  updated_at: string
}

// Vista enriquecida con joins
export interface MaintenanceTicketFull extends MaintenanceTicket {
  user_name: string
  user_email: string
  department_name: string | null
  area_name: string | null
  category_name: string | null
  tecnico_name: string | null
}

export interface MaintenanceStatusHistory {
  id: string
  ticket_id: string
  changed_by: string
  from_status: MaintenanceStatus | null
  to_status: MaintenanceStatus
  comment: string | null
  created_at: string
  changer?: { full_name: string; email: string }
}

export interface MaintenanceComment {
  id: string
  ticket_id: string
  author_id: string
  body: string
  is_internal: boolean
  created_at: string
  updated_at: string
  author?: { full_name: string; email: string }
}

export interface MaintenanceEvidencia {
  id: string
  ticket_id: string
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  type: 'pdf_sistema' | 'evidencia'
  created_at: string
}

// ─── Formulario nuevo ticket de mantenimiento ─────────────

export interface NewMaintenanceTicketFormData {
  type: MaintenanceType
  department_id: string
  department_name_snapshot: string
  area_id: string
  area_name_snapshot: string
  encargado_nombre: string
  category_id: string
  servicio: string
  descripcion: string
  fecha_solicitud: string
  fecha_termino_estimada: string
  photo?: File | null
}

// ─── Admin Notifications ──────────────────────────────────

export type AdminNotificationType =
  | 'user_created'
  | 'user_role_changed'
  | 'ticket_created'
  | 'ticket_status_changed'
  | 'ticket_closed'
  | 'ticket_reopened'
  | 'maintenance_created'
  | 'maintenance_status_changed'
  | 'maintenance_assigned'
  | 'maintenance_closed'
  | 'maintenance_cancelled'

export type AdminNotificationModule = 'global' | 'sistemas' | 'mantenimiento'

export interface AdminNotification {
  id: string
  title: string
  message: string | null
  type: AdminNotificationType
  module: AdminNotificationModule
  actor_id: string | null
  actor_name: string | null
  target_id: string | null
  target_type: string | null
  target_folio: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  expires_at: string
  is_read: boolean
}

export const ADMIN_NOTIFICATION_MODULE_LABELS: Record<AdminNotificationModule, string> = {
  global:        'Global',
  sistemas:      'Sistemas',
  mantenimiento: 'Mantenimiento',
}

export const ADMIN_NOTIFICATION_MODULE_COLORS: Record<AdminNotificationModule, string> = {
  global:        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  sistemas:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  mantenimiento: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

// ─── Métricas de mantenimiento ────────────────────────────

export interface MaintenanceMetrics {
  total: number
  pendiente: number
  en_revision: number
  asignado: number
  en_proceso: number
  terminado: number
  cancelado: number
  general: number
  maquinaria: number
  avgAssignmentMinutes: number | null
  avgResolutionMinutes: number | null
}

export interface TechnicianMetric {
  tecnico_name: string
  count: number
  terminado: number
}

export interface AreaMetric {
  area_name: string
  count: number
}
