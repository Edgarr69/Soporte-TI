-- ─────────────────────────────────────────────────────────────
-- 023 — Limpieza automática de notificaciones viejas
--
-- Las notificaciones de usuario nunca se borraban y las de admin solo
-- se ocultaban al caducar (expires_at) pero seguían en la tabla.
-- Todas las noches (3:00 a.m. hora de México) se borran:
--   - notifications con más de 30 días (leídas o no)
--   - admin_notifications con más de 30 días o ya caducadas
--     (y sus marcas de leído en admin_notification_reads)
-- Solo son avisos: el ticket, su historial y sus comentarios no se tocan.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user  int;
  v_admin int;
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_user = ROW_COUNT;

  DELETE FROM admin_notification_reads
  WHERE notification_id IN (
    SELECT id FROM admin_notifications
    WHERE created_at < now() - interval '30 days' OR expires_at < now()
  );
  DELETE FROM admin_notifications
  WHERE created_at < now() - interval '30 days' OR expires_at < now();
  GET DIAGNOSTICS v_admin = ROW_COUNT;

  RETURN jsonb_build_object('notifications', v_user, 'admin_notifications', v_admin);
END;
$$;

-- Nadie la llama desde la app: solo el job de pg_cron (corre como postgres)
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;

-- Reprograma si ya existía (correr la migración dos veces no duplica el job)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'limpiar-notificaciones';

-- 09:00 UTC = 03:00 en Ciudad de México
SELECT cron.schedule('limpiar-notificaciones', '0 9 * * *', $$SELECT public.cleanup_old_notifications()$$);

-- Verificación: debe aparecer el job activo
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'limpiar-notificaciones';
