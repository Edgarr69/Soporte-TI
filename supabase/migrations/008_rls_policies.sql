-- ============================================================
-- 008_rls_policies.sql
-- Habilita Row Level Security en las tablas principales y
-- define políticas mínimas de acceso por rol.
-- ============================================================

-- ── tickets (módulo sistemas) ────────────────────────────────

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Usuario solo ve sus propios tickets; admins de sistemas y super_admin ven todos
CREATE POLICY "tickets_select" ON tickets FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin_sistemas', 'super_admin')
    )
  );

-- Solo el dueño puede insertar
CREATE POLICY "tickets_insert" ON tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Solo admins de sistemas o super_admin pueden actualizar
CREATE POLICY "tickets_update" ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin_sistemas', 'super_admin')
    )
  );

-- ── maintenance_tickets ──────────────────────────────────────

ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- Usuario ve sus propios tickets; admins de mantenimiento, super_admin y técnicos asignados ven los suyos
CREATE POLICY "mt_select" ON maintenance_tickets FOR SELECT
  USING (
    user_id = auth.uid()
    OR tecnico_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin_mantenimiento', 'super_admin')
    )
  );

-- Solo usuarios autenticados pueden insertar (validación de departamento en Server Action)
CREATE POLICY "mt_insert" ON maintenance_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Solo admins pueden actualizar
CREATE POLICY "mt_update" ON maintenance_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin_mantenimiento', 'super_admin')
    )
  );

-- ── ticket_comments ──────────────────────────────────────────

ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Ver comentarios: dueño del ticket o admin sistemas
CREATE POLICY "tc_select" ON ticket_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin_sistemas', 'super_admin')
          )
        )
    )
  );

-- Insertar: verificado en Server Action
CREATE POLICY "tc_insert" ON ticket_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ── maintenance_comments ─────────────────────────────────────

ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;

-- Ver comentarios no internos: dueño del ticket, técnico asignado o admin
-- Comentarios internos: solo admins
CREATE POLICY "mc_select" ON maintenance_comments FOR SELECT
  USING (
    (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        WHERE mt.id = ticket_id
          AND (mt.user_id = auth.uid() OR mt.tecnico_id = auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_mantenimiento', 'super_admin')
    )
  );

CREATE POLICY "mc_insert" ON maintenance_comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- ── maintenance_evidencias ───────────────────────────────────

ALTER TABLE maintenance_evidencias ENABLE ROW LEVEL SECURITY;

-- Ver evidencias: dueño del ticket, técnico asignado o admin (excluye pdf_sistema para usuarios normales... acceso via signed URL)
CREATE POLICY "me_select" ON maintenance_evidencias FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = ticket_id
        AND (mt.user_id = auth.uid() OR mt.tecnico_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_mantenimiento', 'super_admin')
    )
  );

CREATE POLICY "me_insert" ON maintenance_evidencias FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- Eliminar evidencias: solo admins (validado también en Server Action)
CREATE POLICY "me_delete" ON maintenance_evidencias FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin_mantenimiento', 'super_admin')
    )
  );
