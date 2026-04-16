-- Migración 005: Prioridad en tickets de mantenimiento
-- Los tickets de maquinaria son siempre alta prioridad.
-- tickets de mantenimiento general tienen prioridad 'normal' por defecto.

ALTER TABLE maintenance_tickets
  ADD COLUMN IF NOT EXISTS prioridad text NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta'));

-- Forzar alta prioridad en todos los tickets de maquinaria existentes
UPDATE maintenance_tickets
SET prioridad = 'alta'
WHERE type = 'maquinaria' AND prioridad != 'alta';
