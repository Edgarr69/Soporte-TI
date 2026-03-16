// ============================================================
// Lógica de cálculo de prioridad automática
// (se ejecuta en cliente para preview y en servidor al guardar)
// ============================================================
import type { BlockingLevel, AffectedScope, Priority } from './types'

interface PriorityInput {
  blockingLevel: BlockingLevel
  affectedScope: AffectedScope
  hasWorkaround: boolean
  baseScore: number  // de ticket_subcategories.base_score (1-3)
}

interface PriorityResult {
  priority: Priority
  score: number
}

export function calculatePriority({
  blockingLevel,
  affectedScope,
  hasWorkaround,
  baseScore,
}: PriorityInput): PriorityResult {
  let score = 0

  // Impacto en trabajo
  if (blockingLevel === 'total')   score += 3
  else if (blockingLevel === 'partial') score += 2
  else score += 1

  // Alcance
  score += affectedScope === 'multiple' ? 3 : 1

  // Alternativa temporal
  if (!hasWorkaround) score += 2

  // Tipo de falla (base de subcategoría)
  score += baseScore

  // Determinar prioridad base
  let priority: Priority
  if (score >= 9)      priority = 'critica'
  else if (score >= 7) priority = 'alta'
  else if (score >= 4) priority = 'media'
  else                 priority = 'baja'

  // Regla especial: afecta múltiples → al menos alta
  if (affectedScope === 'multiple' && priority === 'media') {
    priority = 'alta'
  }

  // Regla especial: bloqueo total sin alternativa → al menos alta
  if (blockingLevel === 'total' && !hasWorkaround && priority === 'media') {
    priority = 'alta'
  }

  return { priority, score }
}

export function getPriorityLabel(priority: Priority): string {
  const map: Record<Priority, string> = {
    baja:    'Baja',
    media:   'Media',
    alta:    'Alta',
    critica: 'Crítica',
  }
  return map[priority]
}
