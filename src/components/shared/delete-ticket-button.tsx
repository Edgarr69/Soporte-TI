'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteTicket, type TicketModule } from '@/actions/admin-delete'
import { ConfirmDeleteButton } from './confirm-delete-button'

interface Props {
  module:     TicketModule
  ticketId:   string
  folio:      string
  redirectTo: string     // lista a la que se regresa después de borrar
}

/** Solo se renderiza para super_admin (lo decide la página); la acción también lo valida. */
export function DeleteTicketButton({ module, ticketId, folio, redirectTo }: Props) {
  const router = useRouter()
  return (
    <ConfirmDeleteButton
      label="Eliminar ticket"
      confirmText={`¿Eliminar ${folio} con su historial, comentarios y archivos? No se puede deshacer.`}
      onConfirm={async () => {
        const r = await deleteTicket(module, ticketId)
        if (r.error) { toast.error(r.error); return false }
        toast.success(r.folioReajustado
          ? `${folio} eliminado. El contador de folios regresó: el siguiente reutilizará ese número.`
          : `${folio} eliminado.`)
        router.push(redirectTo)
        router.refresh()
        return true
      }}
    />
  )
}
