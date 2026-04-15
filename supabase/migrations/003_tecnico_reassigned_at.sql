-- Agrega campo para rastrear cuándo fue reasignado el técnico
-- Permite detectar si el PDF está desactualizado tras una reasignación
ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS tecnico_reassigned_at timestamptz DEFAULT NULL;
