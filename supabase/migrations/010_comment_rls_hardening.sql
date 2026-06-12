-- ─────────────────────────────────────────────────────────────
-- 010 — Endurecer RLS de comentarios (sistemas + mantenimiento)
--
-- Problemas que corrige:
--  1. tc_select dejaba al dueño del ticket leer comentarios INTERNOS
--     de los admins vía Data API (la UI los filtra, pero RLS no).
--  2. tc_insert / mc_insert solo exigían author_id = auth.uid():
--     cualquier usuario autenticado podía insertar comentarios en
--     tickets ajenos (incluso marcados como internos) llamando a la
--     Data API directamente, saltándose las Server Actions.
--
-- Reglas resultantes (espejo de las Server Actions):
--  - Sistemas: comenta el dueño del ticket (no interno) o admin
--    sistemas / super_admin (cualquiera). Internos solo visibles
--    para admins.
--  - Mantenimiento: comenta el dueño o el técnico asignado (no
--    interno) o admin mantenimiento / super_admin (cualquiera).
-- ─────────────────────────────────────────────────────────────

-- ── ticket_comments ──────────────────────────────────────────

DROP POLICY IF EXISTS "tc_select" ON ticket_comments;
CREATE POLICY "tc_select" ON ticket_comments FOR SELECT
  USING (
    (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM tickets t
        WHERE t.id = ticket_id
          AND t.user_id = (SELECT auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin_sistemas', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tc_insert" ON ticket_comments;
CREATE POLICY "tc_insert" ON ticket_comments FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM tickets t
          WHERE t.id = ticket_id
            AND t.user_id = (SELECT auth.uid())
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('admin_sistemas', 'super_admin')
      )
    )
  );

-- ── maintenance_comments ─────────────────────────────────────

DROP POLICY IF EXISTS "mc_insert" ON maintenance_comments;
CREATE POLICY "mc_insert" ON maintenance_comments FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM maintenance_tickets mt
          WHERE mt.id = ticket_id
            AND (mt.user_id = (SELECT auth.uid()) OR mt.tecnico_id = (SELECT auth.uid()))
        )
      )
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('admin_mantenimiento', 'super_admin')
      )
    )
  );
