-- ─────────────────────────────────────────────────────────────
-- 019 — Agrega el departamento "Sistemas" a la lista fija
-- (la 017 la dejó en 12; con este quedan 13)
-- ─────────────────────────────────────────────────────────────

INSERT INTO departments (name)
SELECT 'Sistemas'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE lower(name) = 'sistemas');
