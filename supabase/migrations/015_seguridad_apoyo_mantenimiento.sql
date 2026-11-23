-- ─────────────────────────────────────────────────────────────
-- 015 — Seguridad e Higiene: solicitar apoyo a Mantenimiento
--
-- Seguridad puede pedir a Mantenimiento que repare algo de un reporte.
-- Mantenimiento acepta (se crea una solicitud de mantenimiento ligada,
-- marcada como originada en Seguridad, y al terminarla se cierra el
-- reporte de seguridad) o rechaza (Seguridad lo cierra por su cuenta).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE seguridad_tickets
  ADD COLUMN IF NOT EXISTS mant_request_status   text
    CHECK (mant_request_status IN ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  ADD COLUMN IF NOT EXISTS mant_request_type     text
    CHECK (mant_request_type IN ('general', 'maquinaria')),
  ADD COLUMN IF NOT EXISTS mant_request_servicio text,
  ADD COLUMN IF NOT EXISTS mant_request_note     text,
  ADD COLUMN IF NOT EXISTS mant_requested_at     timestamptz,
  ADD COLUMN IF NOT EXISTS mant_requested_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mant_responded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS mant_responded_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mant_reject_reason    text,
  ADD COLUMN IF NOT EXISTS maintenance_ticket_id uuid,
  ADD COLUMN IF NOT EXISTS resolved_by_mantenimiento boolean NOT NULL DEFAULT false;

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS seguridad_ticket_id uuid REFERENCES seguridad_tickets(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seguridad_tickets_maintenance_ticket_id_fkey'
  ) THEN
    ALTER TABLE seguridad_tickets
      ADD CONSTRAINT seguridad_tickets_maintenance_ticket_id_fkey
      FOREIGN KEY (maintenance_ticket_id) REFERENCES maintenance_tickets(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_st_mant_request
  ON seguridad_tickets (mant_request_status, mant_requested_at DESC)
  WHERE mant_request_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mt_seguridad_ticket
  ON maintenance_tickets (seguridad_ticket_id)
  WHERE seguridad_ticket_id IS NOT NULL;

-- Nuevos tipos de notificación admin (lista completa: recrea el CHECK de 013)
ALTER TABLE admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_type_check;
ALTER TABLE admin_notifications ADD CONSTRAINT admin_notifications_type_check CHECK (
  type IS NULL OR type IN (
    'user_created', 'user_role_changed',
    'ticket_created', 'ticket_status_changed', 'ticket_closed', 'ticket_reopened',
    'maintenance_created', 'maintenance_status_changed', 'maintenance_assigned',
    'maintenance_closed', 'maintenance_cancelled',
    'seguridad_created', 'seguridad_status_changed', 'seguridad_closed',
    'seguridad_cancelled', 'seguridad_reopened',
    'seguridad_mant_requested', 'seguridad_mant_accepted', 'seguridad_mant_rejected'
  )
) NOT VALID;

-- Gráfica del dashboard: derivaciones a mantenimiento por mes (12 meses)
CREATE OR REPLACE FUNCTION get_seguridad_mant_by_month()
RETURNS TABLE (month text, solicitados bigint, aceptados bigint, rechazados bigint, terminados bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    to_char(mant_requested_at, 'YYYY-MM'),
    count(*),
    count(*) FILTER (WHERE mant_request_status = 'aceptada'),
    count(*) FILTER (WHERE mant_request_status = 'rechazada'),
    count(*) FILTER (WHERE resolved_by_mantenimiento)
  FROM seguridad_tickets
  WHERE mant_requested_at >= now() - interval '12 months'
  GROUP BY 1 ORDER BY 1;
$$;

REVOKE EXECUTE ON FUNCTION get_seguridad_mant_by_month() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION get_seguridad_mant_by_month() TO service_role;
