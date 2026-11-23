-- ─────────────────────────────────────────────────────────────
-- 014 — Notificaciones admin para admin_seguridad
--
-- get_admin_unread_count / get_admin_notifications_for_user (schema
-- base, no versionadas hasta ahora) tenían una lista fija de roles y
-- devolvían vacío para admin_seguridad. Mismas funciones, agregando el
-- rol y su módulo ('seguridad' + 'global').
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_unread_count()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_role  text;
  v_count bigint;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null then return 0; end if;
  if v_role not in ('admin_sistemas', 'admin_mantenimiento', 'admin_seguridad', 'super_admin') then
    return 0;
  end if;

  select count(*) into v_count
  from admin_notifications n
  where n.expires_at > now()
    and not exists (
      select 1 from admin_notification_reads r
      where r.notification_id = n.id and r.user_id = auth.uid()
    )
    and (
      v_role = 'super_admin'
      or (v_role = 'admin_sistemas'      and n.module in ('sistemas', 'global'))
      or (v_role = 'admin_mantenimiento' and n.module in ('mantenimiento', 'global'))
      or (v_role = 'admin_seguridad'     and n.module in ('seguridad', 'global'))
    );
  return v_count;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_notifications_for_user(p_limit integer, p_offset integer)
RETURNS TABLE(
  id uuid, title text, message text, type text, module text,
  actor_id uuid, actor_name text, target_id text, target_type text,
  target_folio text, metadata jsonb, created_at timestamp with time zone,
  expires_at timestamp with time zone, is_read boolean
)
LANGUAGE plpgsql AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE profiles.id = auth.uid();
  IF v_role IS NULL THEN RETURN; END IF;
  IF v_role NOT IN ('admin_sistemas', 'admin_mantenimiento', 'admin_seguridad', 'super_admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT n.id, n.title, n.message, n.type, n.module, n.actor_id, n.actor_name,
         n.target_id, n.target_type, n.target_folio, n.metadata,
         n.created_at, n.expires_at,
         (r.user_id IS NOT NULL) AS is_read
  FROM admin_notifications n
  LEFT JOIN admin_notification_reads r
    ON r.notification_id = n.id AND r.user_id = auth.uid()
  WHERE n.expires_at > now()
    AND (
      v_role = 'super_admin'
      OR (v_role = 'admin_sistemas'      AND n.module IN ('sistemas', 'global'))
      OR (v_role = 'admin_mantenimiento' AND n.module IN ('mantenimiento', 'global'))
      OR (v_role = 'admin_seguridad'     AND n.module IN ('seguridad', 'global'))
    )
  ORDER BY n.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
