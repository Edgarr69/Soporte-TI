-- ─────────────────────────────────────────────────────────────
-- 017 — Lista fija de departamentos (reemplaza la existente)
--
-- Deja en `departments` EXACTAMENTE esta lista:
--   Recursos Humanos, Seguridad e Higiene, Ventas, Ambiental,
--   Gerencia Producción, Mantenimiento, Logística, Contabilidad,
--   Gerencia, Director General, Almacén, Otro
--
-- 1. Si ya existe uno equivalente (sin importar mayúsculas ni
--    acentos, ej. "logistica"), se renombra y conserva su id.
-- 2. Se insertan los que falten.
-- 3. Los departamentos que NO están en la lista se eliminan:
--    - usuarios que los tenían → department_id NULL y
--      first_login_completed = false (eligen de nuevo al entrar)
--    - tickets / solicitudes / reportes → se pasan a "Otro"
--      (maintenance_tickets.department_id es NOT NULL)
--    - sus encargados en department_managers → se eliminan
--
-- Todo corre en una transacción: si algo falla no cambia nada.
-- ─────────────────────────────────────────────────────────────

BEGIN;

CREATE TEMP TABLE _dept_oficial (name text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO _dept_oficial (name) VALUES
  ('Recursos Humanos'), ('Seguridad e Higiene'), ('Ventas'), ('Ambiental'),
  ('Gerencia Producción'), ('Mantenimiento'), ('Logística'), ('Contabilidad'),
  ('Gerencia'), ('Director General'), ('Almacén'), ('Otro');

-- Normaliza para comparar: minúsculas, sin acentos, sin espacios extra
CREATE FUNCTION pg_temp.norm(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(translate(lower(trim(t)), 'áéíóúüñ', 'aeiouun'), '\s+', ' ', 'g')
$$;

-- 1. Renombrar equivalentes (si hay duplicados, se conserva el más antiguo
--    por id; los demás caen en el paso 3)
UPDATE departments d
SET name = o.name
FROM _dept_oficial o
WHERE pg_temp.norm(d.name) = pg_temp.norm(o.name)
  AND d.id = (
    SELECT min(d2.id::text)::uuid FROM departments d2
    WHERE pg_temp.norm(d2.name) = pg_temp.norm(o.name)
  );

-- 2. Insertar los que falten
INSERT INTO departments (name)
SELECT o.name FROM _dept_oficial o
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.name = o.name);

-- 3. Eliminar los que no están en la lista
CREATE TEMP TABLE _dept_borrar ON COMMIT DROP AS
SELECT id FROM departments WHERE name NOT IN (SELECT name FROM _dept_oficial);

UPDATE profiles
SET department_id = NULL, first_login_completed = false
WHERE department_id IN (SELECT id FROM _dept_borrar);

UPDATE tickets             SET department_id = (SELECT id FROM departments WHERE name = 'Otro')
WHERE department_id IN (SELECT id FROM _dept_borrar);
UPDATE maintenance_tickets SET department_id = (SELECT id FROM departments WHERE name = 'Otro')
WHERE department_id IN (SELECT id FROM _dept_borrar);
UPDATE seguridad_tickets   SET department_id = (SELECT id FROM departments WHERE name = 'Otro')
WHERE department_id IN (SELECT id FROM _dept_borrar);

DELETE FROM department_managers WHERE department_id IN (SELECT id FROM _dept_borrar);
DELETE FROM departments         WHERE id            IN (SELECT id FROM _dept_borrar);

COMMIT;

-- Verificación: debe devolver exactamente 12 filas
-- SELECT name FROM departments ORDER BY name;
