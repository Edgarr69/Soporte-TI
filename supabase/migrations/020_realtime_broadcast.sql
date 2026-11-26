-- ─────────────────────────────────────────────────────────────
-- 020 — Realtime: de postgres_changes a Broadcast desde la base
--
-- La prueba de carga mostró que el mayor consumo de la base era
-- el sondeo del WAL de Realtime (postgres_changes): corre sin parar
-- mientras haya un navegador suscrito y por cada cambio evalúa RLS
-- para cada suscriptor. En el plan Free eso saturó la instancia.
--
-- Ahora cada INSERT relevante manda un aviso por Broadcast con
-- realtime.send(). El aviso NO lleva contenido (solo ids/módulo):
-- el cliente vuelve a leer la fila con su sesión, así RLS sigue
-- decidiendo qué puede ver cada quien aunque el canal sea público.
--
-- Tópicos (deben coincidir con los del cliente):
--   ticket_comments:<ticket_id>        { id, author_id, is_internal }
--   maintenance_comments:<ticket_id>   { id, author_id, is_internal }
--   seguridad_comments:<ticket_id>     { id, author_id, is_internal }
--   notifications:<user_id>            { id, module }
--   admin_notifications                { id, module }
--
-- Al final se sacan las tablas de la publicación supabase_realtime
-- para que Realtime deje de leer el WAL. Correr DESPUÉS de desplegar
-- el código nuevo (si se corre antes, los chats en vivo dejan de
-- actualizarse unos minutos hasta que termine el deploy).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.broadcast_comment_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('id', NEW.id, 'author_id', NEW.author_id, 'is_internal', NEW.is_internal),
    'insert',
    TG_TABLE_NAME || ':' || NEW.ticket_id,
    false
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Un fallo de Realtime nunca debe impedir guardar el comentario
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.broadcast_notification_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('id', NEW.id, 'module', NEW.module),
    'insert',
    CASE WHEN TG_TABLE_NAME = 'notifications' THEN 'notifications:' || NEW.user_id ELSE 'admin_notifications' END,
    false
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_ticket_comments      ON ticket_comments;
DROP TRIGGER IF EXISTS trg_broadcast_maintenance_comments ON maintenance_comments;
DROP TRIGGER IF EXISTS trg_broadcast_seguridad_comments   ON seguridad_comments;
DROP TRIGGER IF EXISTS trg_broadcast_notifications        ON notifications;
DROP TRIGGER IF EXISTS trg_broadcast_admin_notifications  ON admin_notifications;

CREATE TRIGGER trg_broadcast_ticket_comments      AFTER INSERT ON ticket_comments      FOR EACH ROW EXECUTE FUNCTION broadcast_comment_insert();
CREATE TRIGGER trg_broadcast_maintenance_comments AFTER INSERT ON maintenance_comments FOR EACH ROW EXECUTE FUNCTION broadcast_comment_insert();
CREATE TRIGGER trg_broadcast_seguridad_comments   AFTER INSERT ON seguridad_comments   FOR EACH ROW EXECUTE FUNCTION broadcast_comment_insert();
CREATE TRIGGER trg_broadcast_notifications        AFTER INSERT ON notifications        FOR EACH ROW EXECUTE FUNCTION broadcast_notification_insert();
CREATE TRIGGER trg_broadcast_admin_notifications  AFTER INSERT ON admin_notifications  FOR EACH ROW EXECUTE FUNCTION broadcast_notification_insert();

-- Realtime deja de sondear el WAL de estas tablas
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['admin_notification_reads', 'admin_notifications',
                           'maintenance_comments', 'seguridad_comments', 'ticket_comments'] LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$$;
