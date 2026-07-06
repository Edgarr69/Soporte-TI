-- ─────────────────────────────────────────────────────────────
-- 011 — Escalabilidad: índices, RLS optimizado y storage privado
--
-- 1. Índices para las queries que hace la app (filtros por
--    usuario/estado/técnico + orden por created_at). Sin ellos,
--    cada lista escanea la tabla completa a medida que crece.
-- 2. RLS: envolver auth.uid() en (SELECT auth.uid()) para que
--    Postgres lo evalúe UNA vez por query (initplan) en vez de
--    una vez POR FILA — crítico con miles de tickets/comentarios.
--    (Las policies de comentarios ya se corrigieron en 010.)
-- 3. Storage: el bucket maintenance-docs deja de ser público —
--    los archivos se sirven con signed URLs generadas server-side.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Índices ───────────────────────────────────────────────

-- notifications: badge de no-leídas en cada request + centro de notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications (user_id, is_read, created_at DESC);

-- tickets (sistemas): "mis tickets" + listas admin con filtros
CREATE INDEX IF NOT EXISTS idx_tickets_user_created
  ON tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status_created
  ON tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_priority_created
  ON tickets (priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_created
  ON tickets (created_at DESC);

-- maintenance_tickets: "mis tickets", panel técnico, listas admin y dashboard
CREATE INDEX IF NOT EXISTS idx_mt_user_created
  ON maintenance_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_tecnico_status
  ON maintenance_tickets (tecnico_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_status_created
  ON maintenance_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_type_created
  ON maintenance_tickets (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mt_created
  ON maintenance_tickets (created_at DESC);

-- Hijos por ticket: comentarios, historial y evidencias
CREATE INDEX IF NOT EXISTS idx_tc_ticket_created
  ON ticket_comments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tsh_ticket_created
  ON ticket_status_history (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mc_ticket_created
  ON maintenance_comments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_msh_ticket_created
  ON maintenance_status_history (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_me_ticket_type_created
  ON maintenance_evidencias (ticket_id, type, created_at);

-- profiles: listas de usuarios/técnicos filtradas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

-- ── 2. RLS con auth.uid() en initplan ────────────────────────
-- Mismas reglas que 008, pero (SELECT auth.uid()) se evalúa una
-- sola vez por query. Los EXISTS a profiles quedan sin correlación
-- con la fila externa, así que Postgres también los ejecuta una vez.

-- tickets
DROP POLICY IF EXISTS "tickets_select" ON tickets;
CREATE POLICY "tickets_select" ON tickets FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin_sistemas', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tickets_insert" ON tickets;
CREATE POLICY "tickets_insert" ON tickets FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "tickets_update" ON tickets;
CREATE POLICY "tickets_update" ON tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin_sistemas', 'super_admin')
    )
  );

-- maintenance_tickets
DROP POLICY IF EXISTS "mt_select" ON maintenance_tickets;
CREATE POLICY "mt_select" ON maintenance_tickets FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR tecnico_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin_mantenimiento', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "mt_insert" ON maintenance_tickets;
CREATE POLICY "mt_insert" ON maintenance_tickets FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "mt_update" ON maintenance_tickets;
CREATE POLICY "mt_update" ON maintenance_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin_mantenimiento', 'super_admin')
    )
  );

-- maintenance_comments (mc_insert ya quedó optimizado en 010)
DROP POLICY IF EXISTS "mc_select" ON maintenance_comments;
CREATE POLICY "mc_select" ON maintenance_comments FOR SELECT
  USING (
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
  );

-- maintenance_evidencias
DROP POLICY IF EXISTS "me_select" ON maintenance_evidencias;
CREATE POLICY "me_select" ON maintenance_evidencias FOR SELECT
  USING (
    uploaded_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM maintenance_tickets mt
      WHERE mt.id = ticket_id
        AND (mt.user_id = (SELECT auth.uid()) OR mt.tecnico_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin_mantenimiento', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "me_insert" ON maintenance_evidencias;
CREATE POLICY "me_insert" ON maintenance_evidencias FOR INSERT
  WITH CHECK (uploaded_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "me_delete" ON maintenance_evidencias;
CREATE POLICY "me_delete" ON maintenance_evidencias FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin_mantenimiento', 'super_admin')
    )
  );

-- ── 3. Storage: bucket privado + policy de subida ────────────
-- Los archivos dejan de ser accesibles por URL pública; la app
-- genera signed URLs (1 h) server-side tras validar el rol.
-- IMPORTANTE: aplicar junto con el deploy del código que usa
-- signed URLs — las URLs públicas viejas dejarán de funcionar.

UPDATE storage.buckets SET public = false WHERE id = 'maintenance-docs';

-- uploadEvidencia sube con el cliente del usuario autenticado:
-- necesita policy de INSERT sobre el bucket (el resto de las
-- operaciones usan el service role, que ignora RLS)
DROP POLICY IF EXISTS "maintenance_docs_insert" ON storage.objects;
CREATE POLICY "maintenance_docs_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-docs'
    AND (storage.foldername(name))[1] = 'maintenance'
  );
