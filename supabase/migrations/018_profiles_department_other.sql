-- ─────────────────────────────────────────────────────────────
-- 018 — Departamento "Otro" con texto libre
--
-- Cuando el usuario elige el departamento "Otro" escribe cuál es.
-- Se guarda aquí y se muestra como "Otro (texto)" en usuarios y en
-- los snapshots de solicitudes de mantenimiento y reportes de
-- seguridad.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department_other text
  CHECK (department_other IS NULL OR char_length(department_other) <= 100);
