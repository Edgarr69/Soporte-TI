-- ─────────────────────────────────────────────────────────────
-- 022 — Subcategoría opcional en tickets de sistemas
--
-- "Impresoras" y "Accesos / Permisos" no tienen subcategorías, pero
-- tickets.subcategory_id era NOT NULL: ningún ticket de esas categorías
-- se podía crear. La app exige subcategoría solo cuando la categoría
-- tiene alguna (createTicket lo valida en el servidor).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE tickets ALTER COLUMN subcategory_id DROP NOT NULL;
