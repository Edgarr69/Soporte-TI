-- Migración 006: Restricción de tipos de ticket por departamento
-- Por defecto todos los departamentos pueden crear ambos tipos.
-- Si se quita 'maquinaria', ese departamento solo puede crear tickets generales.

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS allowed_ticket_types text[] NOT NULL DEFAULT ARRAY['general','maquinaria'];

-- Índice para acelerar la validación en el backend
CREATE INDEX IF NOT EXISTS idx_departments_allowed_types
  ON departments USING GIN (allowed_ticket_types);
