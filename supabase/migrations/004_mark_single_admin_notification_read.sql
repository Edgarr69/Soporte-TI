-- Marca una sola notificación admin como leída para el usuario en sesión
CREATE OR REPLACE FUNCTION mark_admin_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO admin_notification_reads (notification_id, user_id)
  VALUES (p_notification_id, auth.uid())
  ON CONFLICT (notification_id, user_id) DO NOTHING;
END;
$$;
