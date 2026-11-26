-- ─────────────────────────────────────────────────────────────
-- 021 — Eliminar tickets (solo super_admin) y reajustar el folio
--
-- admin_delete_ticket(p_module, p_id) borra el ticket con todo lo que
-- depende de él (historial, comentarios, evidencias, notificaciones)
-- y, si su folio era el ÚLTIMO emitido, regresa el contador al mayor
-- folio que siga existiendo. Así, si había TKT-00001..00005 y se
-- borra el 5, el siguiente vuelve a ser TKT-00005; si se borran los
-- cinco, el siguiente es TKT-00001. Borrar uno de en medio (ej. el 3)
-- NO mueve el contador: nunca se reutiliza un folio que ya existe.
--
-- Contadores:
--   sistemas      → secuencia ticket_folio_seq           (TKT-00001)
--   mantenimiento → folio_sequences (módulo + mes)        (MTTO/MAQ-NOV-0001)
--   seguridad     → seguridad_folio_sequences (por mes)   (SEG-NOV-0001)
-- En mantenimiento y seguridad el contador es mensual: solo se ajusta
-- si el ticket borrado es del mes en curso (los de meses anteriores ya
-- no afectan a los folios nuevos).
--
-- Los archivos de Storage los borra la server action antes de llamar
-- a esta función (la base no puede borrar objetos de Storage).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_ticket(p_module text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_folio    text;
  v_type     text;
  v_created  timestamptz;
  v_num      int;
  v_prefix   text;
  v_max      int;
  v_period   text := to_char(now() AT TIME ZONE 'America/Mexico_City', 'YYYY-MM');
  v_last     bigint;
  v_called   boolean;
  v_reset    boolean := false;
BEGIN
  IF current_user_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Solo el super administrador puede eliminar tickets';
  END IF;

  -- ── Sistemas ───────────────────────────────────────────────
  IF p_module = 'sistemas' THEN
    SELECT folio INTO v_folio FROM tickets WHERE id = p_id FOR UPDATE;
    IF v_folio IS NULL THEN RAISE EXCEPTION 'Ticket no encontrado'; END IF;

    DELETE FROM ticket_status_history WHERE ticket_id = p_id;
    DELETE FROM ticket_comments       WHERE ticket_id = p_id;
    DELETE FROM notifications         WHERE ticket_id = p_id;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'ticket_attachments' AND column_name = 'ticket_id') THEN
      EXECUTE 'DELETE FROM ticket_attachments WHERE ticket_id = $1' USING p_id;
    END IF;
    DELETE FROM tickets WHERE id = p_id;

    -- Folio TKT-00005 → 5. Solo si era el último emitido
    IF v_folio ~ '^TKT-\d+$' THEN
      v_num := split_part(v_folio, '-', 2)::int;
      SELECT last_value, is_called INTO v_last, v_called FROM ticket_folio_seq;
      IF v_called AND v_last = v_num THEN
        SELECT max(split_part(folio, '-', 2)::int) INTO v_max FROM tickets WHERE folio ~ '^TKT-\d+$';
        IF v_max IS NULL THEN PERFORM setval('ticket_folio_seq', 1, false);
        ELSE                  PERFORM setval('ticket_folio_seq', v_max, true);
        END IF;
        v_reset := true;
      END IF;
    END IF;

  -- ── Mantenimiento ──────────────────────────────────────────
  ELSIF p_module = 'mantenimiento' THEN
    SELECT folio, type, created_at INTO v_folio, v_type, v_created FROM maintenance_tickets WHERE id = p_id FOR UPDATE;
    IF v_folio IS NULL THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;

    DELETE FROM maintenance_status_history WHERE ticket_id = p_id;
    DELETE FROM maintenance_comments       WHERE ticket_id = p_id;
    DELETE FROM maintenance_evidencias     WHERE ticket_id = p_id;
    UPDATE seguridad_tickets SET maintenance_ticket_id = NULL WHERE maintenance_ticket_id = p_id;
    DELETE FROM maintenance_tickets WHERE id = p_id;

    -- Folio MTTO-NOV-0007 → prefijo "MTTO-NOV-", número 7
    IF v_folio ~ '^[A-Z]+-[A-Z]{3}-\d+$'
       AND to_char(v_created AT TIME ZONE 'America/Mexico_City', 'YYYY-MM') = v_period THEN
      v_num    := split_part(v_folio, '-', 3)::int;
      v_prefix := split_part(v_folio, '-', 1) || '-' || split_part(v_folio, '-', 2) || '-';
      SELECT max(split_part(folio, '-', 3)::int) INTO v_max
      FROM maintenance_tickets
      WHERE type = v_type AND folio LIKE v_prefix || '%' AND folio ~ '^[A-Z]+-[A-Z]{3}-\d+$'
        AND created_at > now() - interval '45 days';
      UPDATE folio_sequences SET last_seq = coalesce(v_max, 0)
      WHERE module = v_type AND year_month = v_period AND last_seq = v_num;
      v_reset := FOUND;
    END IF;

  -- ── Seguridad e Higiene ────────────────────────────────────
  ELSIF p_module = 'seguridad' THEN
    SELECT folio, created_at INTO v_folio, v_created FROM seguridad_tickets WHERE id = p_id FOR UPDATE;
    IF v_folio IS NULL THEN RAISE EXCEPTION 'Reporte no encontrado'; END IF;

    DELETE FROM seguridad_status_history WHERE ticket_id = p_id;
    DELETE FROM seguridad_comments       WHERE ticket_id = p_id;
    DELETE FROM seguridad_evidencias     WHERE ticket_id = p_id;
    UPDATE maintenance_tickets SET seguridad_ticket_id = NULL WHERE seguridad_ticket_id = p_id;
    DELETE FROM seguridad_tickets WHERE id = p_id;

    IF v_folio ~ '^SEG-[A-Z]{3}-\d+$'
       AND to_char(v_created AT TIME ZONE 'America/Mexico_City', 'YYYY-MM') = v_period THEN
      v_num    := split_part(v_folio, '-', 3)::int;
      v_prefix := 'SEG-' || split_part(v_folio, '-', 2) || '-';
      SELECT max(split_part(folio, '-', 3)::int) INTO v_max
      FROM seguridad_tickets
      WHERE folio LIKE v_prefix || '%' AND folio ~ '^SEG-[A-Z]{3}-\d+$'
        AND created_at > now() - interval '45 days';
      UPDATE seguridad_folio_sequences SET last_value = coalesce(v_max, 0)
      WHERE period = v_period AND last_value = v_num;
      v_reset := FOUND;
    END IF;

  ELSE
    RAISE EXCEPTION 'Módulo no válido: %', p_module;
  END IF;

  -- Notificaciones de admin que apuntaban a este ticket
  DELETE FROM admin_notification_reads
  WHERE notification_id IN (SELECT id FROM admin_notifications WHERE target_id = p_id::text);
  DELETE FROM admin_notifications WHERE target_id = p_id::text;

  RETURN jsonb_build_object('folio', v_folio, 'folio_reajustado', v_reset);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_delete_ticket(text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_delete_ticket(text, uuid) TO authenticated;
