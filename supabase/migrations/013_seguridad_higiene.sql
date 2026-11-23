-- ─────────────────────────────────────────────────────────────
-- 013 — Módulo de Seguridad e Higiene
--
-- 1. Nuevo rol `admin_seguridad` en profiles.role
-- 2. Módulo 'seguridad' en notifications / admin_notifications
--    (+ tipos de notificación admin seguridad_*)
-- 3. Tablas: seguridad_categories, seguridad_tickets,
--    seguridad_status_history, seguridad_comments, seguridad_evidencias
-- 4. Folio atómico SEG-MES-NNNN vía trigger
-- 5. RLS (mismo esquema que mantenimiento, roles admin_seguridad/super_admin)
-- 6. Bucket privado `seguridad-docs`
-- 7. Funciones de agregación para el dashboard (solo service_role)
--
-- El schema base no está versionado, así que los cambios sobre columnas
-- existentes (role/module/type) se hacen de forma defensiva: si la columna
-- es un ENUM se agrega el valor; si es text con CHECK se recrea el CHECK.
-- ─────────────────────────────────────────────────────────────

-- ── Helper temporal: permitir valores nuevos en una columna ──
CREATE OR REPLACE FUNCTION pg_temp.allow_values(p_table text, p_column text, p_values text[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_typtype char;
  v_typname text;
  v_attnum  smallint;
  v_con     record;
  v_val     text;
  v_list    text;
BEGIN
  SELECT t.typtype, t.typname, a.attnum
    INTO v_typtype, v_typname, v_attnum
  FROM pg_attribute a
  JOIN pg_type t ON t.oid = a.atttypid
  WHERE a.attrelid = ('public.' || p_table)::regclass
    AND a.attname  = p_column
    AND NOT a.attisdropped;

  IF v_attnum IS NULL THEN
    RAISE NOTICE 'Columna %.% no existe — se omite', p_table, p_column;
    RETURN;
  END IF;

  IF v_typtype = 'e' THEN
    -- Columna ENUM: agregar los valores que falten
    FOREACH v_val IN ARRAY p_values LOOP
      EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_typname, v_val);
    END LOOP;
    RETURN;
  END IF;

  -- Columna text: eliminar los CHECK que involucren solo esta columna
  FOR v_con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = ('public.' || p_table)::regclass
      AND contype  = 'c'
      AND conkey   = ARRAY[v_attnum]
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', p_table, v_con.conname);
  END LOOP;

  SELECT string_agg(quote_literal(v), ', ') INTO v_list FROM unnest(p_values) v;
  -- NOT VALID: no revalida filas históricas (por si hubiera valores legacy)
  EXECUTE format(
    'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I IN (%s)) NOT VALID',
    p_table, p_table || '_' || p_column || '_check', p_column, p_column, v_list
  );
END;
$$;

-- ── 1. Rol admin_seguridad ───────────────────────────────────
SELECT pg_temp.allow_values('profiles', 'role', ARRAY[
  'usuario', 'admin_sistemas', 'admin_mantenimiento', 'admin_seguridad',
  'super_admin', 'tecnico_mantenimiento'
]);

-- ── 2. Módulo 'seguridad' en notificaciones ──────────────────
SELECT pg_temp.allow_values('notifications', 'module', ARRAY[
  'sistemas', 'mantenimiento', 'seguridad'
]);

SELECT pg_temp.allow_values('admin_notifications', 'module', ARRAY[
  'global', 'sistemas', 'mantenimiento', 'seguridad'
]);

SELECT pg_temp.allow_values('admin_notifications', 'type', ARRAY[
  'user_created', 'user_role_changed',
  'ticket_created', 'ticket_status_changed', 'ticket_closed', 'ticket_reopened',
  'maintenance_created', 'maintenance_status_changed', 'maintenance_assigned',
  'maintenance_closed', 'maintenance_cancelled',
  'seguridad_created', 'seguridad_status_changed', 'seguridad_closed',
  'seguridad_cancelled', 'seguridad_reopened'
]);

-- Rol del usuario en sesión sin recursión de RLS sobre profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM profiles WHERE id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.current_user_role() TO authenticated, service_role;

-- admin_seguridad necesita leer perfiles (gestión de usuarios, nombres en
-- joins) igual que los demás admins. Policy permisiva adicional: se suma
-- (OR) a las existentes, no las reemplaza.
DROP POLICY IF EXISTS "profiles_select_admin_seguridad" ON profiles;
CREATE POLICY "profiles_select_admin_seguridad" ON profiles FOR SELECT
  USING ((SELECT public.current_user_role()) = 'admin_seguridad');

-- Mismo criterio para el historial admin: ver eventos de su módulo + global
DROP POLICY IF EXISTS "admin_notifications_select_seguridad" ON admin_notifications;
CREATE POLICY "admin_notifications_select_seguridad" ON admin_notifications FOR SELECT
  USING (
    (SELECT public.current_user_role()) = 'admin_seguridad'
    AND module::text IN ('seguridad', 'global')
  );

-- ── 3. Tablas ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS seguridad_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO seguridad_categories (name, sort_order)
SELECT v.name, v.ord
FROM (VALUES
  ('Condición insegura',          1),
  ('Acto inseguro',               2),
  ('Incidente / casi accidente',  3),
  ('Accidente',                   4),
  ('Equipo de protección (EPP)',  5),
  ('Orden y limpieza',            6),
  ('Riesgo eléctrico',            7),
  ('Riesgo de incendio',          8),
  ('Derrame / sustancias químicas', 9),
  ('Señalización',               10),
  ('Ergonomía',                  11),
  ('Higiene / sanitarios',       12),
  ('Otro',                       13)
) AS v(name, ord)
WHERE NOT EXISTS (SELECT 1 FROM seguridad_categories);

CREATE TABLE IF NOT EXISTS seguridad_tickets (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio                     text UNIQUE,
  user_id                   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id             uuid REFERENCES departments(id) ON DELETE SET NULL,
  department_name_snapshot  text,
  area_id                   uuid REFERENCES areas(id) ON DELETE SET NULL,
  area_name_snapshot        text,
  category_id               uuid REFERENCES seguridad_categories(id) ON DELETE SET NULL,
  category_name_snapshot    text,
  nivel_riesgo              text NOT NULL DEFAULT 'medio'
                              CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto', 'critico')),
  ubicacion                 text NOT NULL,
  descripcion               text NOT NULL,
  status                    text NOT NULL DEFAULT 'pendiente'
                              CHECK (status IN ('pendiente', 'en_revision', 'en_proceso', 'terminado', 'cancelado')),
  acciones_correctivas      text,
  cancel_reason             text,
  reviewed_at               timestamptz,
  started_at                timestamptz,
  finished_at               timestamptz,
  cancelled_at              timestamptz,
  first_response_minutes    integer,
  resolution_time_minutes   integer,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguridad_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES seguridad_tickets(id) ON DELETE CASCADE,
  changed_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  from_status  text,
  to_status    text NOT NULL,
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguridad_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES seguridad_tickets(id) ON DELETE CASCADE,
  author_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  body         text NOT NULL,
  is_internal  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguridad_evidencias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES seguridad_tickets(id) ON DELETE CASCADE,
  uploaded_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  file_name    text NOT NULL,
  file_path    text NOT NULL,
  file_size    bigint,
  mime_type    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices (mismo criterio que 011)
CREATE INDEX IF NOT EXISTS idx_st_user_created     ON seguridad_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_status_created   ON seguridad_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_riesgo_created   ON seguridad_tickets (nivel_riesgo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_st_created          ON seguridad_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssh_ticket_created  ON seguridad_status_history (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sc_ticket_created   ON seguridad_comments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_se_ticket_created   ON seguridad_evidencias (ticket_id, created_at);

-- updated_at automático
CREATE OR REPLACE FUNCTION seguridad_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seguridad_tickets_updated_at ON seguridad_tickets;
CREATE TRIGGER trg_seguridad_tickets_updated_at
  BEFORE UPDATE ON seguridad_tickets
  FOR EACH ROW EXECUTE FUNCTION seguridad_touch_updated_at();

-- ── 4. Folio SEG-MES-NNNN (reinicia cada mes) ────────────────

CREATE TABLE IF NOT EXISTS seguridad_folio_sequences (
  period      text PRIMARY KEY,          -- 'YYYY-MM'
  last_value  integer NOT NULL DEFAULT 0
);
ALTER TABLE seguridad_folio_sequences ENABLE ROW LEVEL SECURITY;  -- sin policies: solo el trigger (definer)

CREATE OR REPLACE FUNCTION seguridad_assign_folio()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now    timestamp := now() AT TIME ZONE 'America/Mexico_City';
  v_period text      := to_char(v_now, 'YYYY-MM');
  v_months text[]    := ARRAY['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  v_next   integer;
BEGIN
  IF NEW.folio IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO seguridad_folio_sequences (period, last_value)
  VALUES (v_period, 1)
  ON CONFLICT (period) DO UPDATE
    SET last_value = seguridad_folio_sequences.last_value + 1
  RETURNING last_value INTO v_next;

  NEW.folio := 'SEG-' || v_months[extract(month FROM v_now)::int] || '-' || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seguridad_assign_folio ON seguridad_tickets;
CREATE TRIGGER trg_seguridad_assign_folio
  BEFORE INSERT ON seguridad_tickets
  FOR EACH ROW EXECUTE FUNCTION seguridad_assign_folio();

-- ── 5. RLS ───────────────────────────────────────────────────

ALTER TABLE seguridad_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguridad_evidencias     ENABLE ROW LEVEL SECURITY;

-- Categorías: lectura para cualquier autenticado, escritura solo admins
DROP POLICY IF EXISTS "scat_select" ON seguridad_categories;
CREATE POLICY "scat_select" ON seguridad_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "scat_write" ON seguridad_categories;
CREATE POLICY "scat_write" ON seguridad_categories FOR ALL
  TO authenticated
  USING ((SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin'));

-- Reportes
DROP POLICY IF EXISTS "st_select" ON seguridad_tickets;
CREATE POLICY "st_select" ON seguridad_tickets FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
  );

DROP POLICY IF EXISTS "st_insert" ON seguridad_tickets;
CREATE POLICY "st_insert" ON seguridad_tickets FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "st_update" ON seguridad_tickets;
CREATE POLICY "st_update" ON seguridad_tickets FOR UPDATE
  USING ((SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin'));

-- El dueño puede cancelar su propio reporte mientras esté pendiente
DROP POLICY IF EXISTS "st_update_owner_cancel" ON seguridad_tickets;
CREATE POLICY "st_update_owner_cancel" ON seguridad_tickets FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND status = 'pendiente')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'cancelado');

-- Historial
DROP POLICY IF EXISTS "ssh_select" ON seguridad_status_history;
CREATE POLICY "ssh_select" ON seguridad_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seguridad_tickets st
      WHERE st.id = ticket_id AND st.user_id = (SELECT auth.uid())
    )
    OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
  );

DROP POLICY IF EXISTS "ssh_insert" ON seguridad_status_history;
CREATE POLICY "ssh_insert" ON seguridad_status_history FOR INSERT
  WITH CHECK (
    changed_by = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM seguridad_tickets st
        WHERE st.id = ticket_id AND st.user_id = (SELECT auth.uid())
      )
      OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
    )
  );

-- Comentarios (mismas reglas que 010: internos solo admins)
DROP POLICY IF EXISTS "sc_select" ON seguridad_comments;
CREATE POLICY "sc_select" ON seguridad_comments FOR SELECT
  USING (
    (
      is_internal = false
      AND EXISTS (
        SELECT 1 FROM seguridad_tickets st
        WHERE st.id = ticket_id AND st.user_id = (SELECT auth.uid())
      )
    )
    OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
  );

DROP POLICY IF EXISTS "sc_insert" ON seguridad_comments;
CREATE POLICY "sc_insert" ON seguridad_comments FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      (
        is_internal = false
        AND EXISTS (
          SELECT 1 FROM seguridad_tickets st
          WHERE st.id = ticket_id AND st.user_id = (SELECT auth.uid())
        )
      )
      OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
    )
  );

-- Evidencias: la escritura se hace con service role desde Server Actions
DROP POLICY IF EXISTS "se_select" ON seguridad_evidencias;
CREATE POLICY "se_select" ON seguridad_evidencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seguridad_tickets st
      WHERE st.id = ticket_id AND st.user_id = (SELECT auth.uid())
    )
    OR (SELECT public.current_user_role()) IN ('admin_seguridad', 'super_admin')
  );

-- Realtime para el chat de reportes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'seguridad_comments'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE seguridad_comments;
  END IF;
END;
$$;

-- ── 6. Storage: bucket privado ───────────────────────────────
-- Subidas y signed URLs se hacen con service role (ignora RLS de storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('seguridad-docs', 'seguridad-docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ── 7. Agregados para el dashboard (ventana 12 meses) ────────

CREATE OR REPLACE FUNCTION get_seguridad_summary()
RETURNS TABLE (
  total bigint,
  pendiente bigint, en_revision bigint, en_proceso bigint,
  terminado bigint, cancelado bigint,
  bajo bigint, medio bigint, alto bigint, critico bigint,
  abiertos_criticos bigint,
  avg_first_response numeric, avg_resolution numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'pendiente'),
    count(*) FILTER (WHERE status = 'en_revision'),
    count(*) FILTER (WHERE status = 'en_proceso'),
    count(*) FILTER (WHERE status = 'terminado'),
    count(*) FILTER (WHERE status = 'cancelado'),
    count(*) FILTER (WHERE nivel_riesgo = 'bajo'),
    count(*) FILTER (WHERE nivel_riesgo = 'medio'),
    count(*) FILTER (WHERE nivel_riesgo = 'alto'),
    count(*) FILTER (WHERE nivel_riesgo = 'critico'),
    count(*) FILTER (WHERE nivel_riesgo IN ('alto', 'critico')
                       AND status IN ('pendiente', 'en_revision', 'en_proceso')),
    round(avg(first_response_minutes)),
    round(avg(resolution_time_minutes))
  FROM seguridad_tickets
  WHERE created_at >= now() - interval '12 months';
$$;

CREATE OR REPLACE FUNCTION get_seguridad_by_category()
RETURNS TABLE (name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(category_name_snapshot, 'Sin categoría'), count(*)
  FROM seguridad_tickets
  WHERE created_at >= now() - interval '12 months'
  GROUP BY 1 ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION get_seguridad_by_area()
RETURNS TABLE (name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(area_name_snapshot, 'Sin área'), count(*)
  FROM seguridad_tickets
  WHERE created_at >= now() - interval '12 months'
  GROUP BY 1 ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION get_seguridad_by_month()
RETURNS TABLE (month text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_char(created_at, 'YYYY-MM'), count(*)
  FROM seguridad_tickets
  WHERE created_at >= now() - interval '12 months'
  GROUP BY 1 ORDER BY 1;
$$;

REVOKE EXECUTE ON FUNCTION get_seguridad_summary()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_seguridad_by_category() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_seguridad_by_area()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_seguridad_by_month()    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION get_seguridad_summary()     TO service_role;
GRANT EXECUTE ON FUNCTION get_seguridad_by_category() TO service_role;
GRANT EXECUTE ON FUNCTION get_seguridad_by_area()     TO service_role;
GRANT EXECUTE ON FUNCTION get_seguridad_by_month()    TO service_role;

-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN MANUAL (después de aplicar):
-- Las funciones get_admin_unread_count / get_admin_notifications_for_user
-- e insert_admin_notification no están versionadas. Revisa si filtran por
-- rol o módulo con listas fijas y, de ser así, agrega 'admin_seguridad' /
-- 'seguridad':
--   SELECT proname, pg_get_functiondef(oid) FROM pg_proc
--   WHERE proname IN ('get_admin_unread_count',
--                     'get_admin_notifications_for_user',
--                     'insert_admin_notification');
-- ─────────────────────────────────────────────────────────────
