-- Agregar columna module a notifications para filtrar por módulo según rol
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS module text CHECK (module IN ('sistemas', 'mantenimiento')) DEFAULT NULL;

-- Actualizar notificaciones existentes: si ticket_id no es null, es de sistemas
-- Las de mantenimiento tienen ticket_id = null pero podemos inferirlas por el título
UPDATE notifications
  SET module = 'sistemas'
  WHERE ticket_id IS NOT NULL;

-- Las notificaciones con título de mantenimiento
UPDATE notifications
  SET module = 'mantenimiento'
  WHERE ticket_id IS NULL
    AND (
      title ILIKE '%mantenimiento%'
      OR title ILIKE '%solicitud%'
      OR body  ILIKE '%solicitud%'
      OR body  ILIKE '%mantenimiento%'
    );

-- Las restantes sin ticket_id que no matchean mantenimiento son de sistemas
UPDATE notifications
  SET module = 'sistemas'
  WHERE module IS NULL;
