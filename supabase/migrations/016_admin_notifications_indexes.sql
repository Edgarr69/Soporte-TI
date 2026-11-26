-- ─────────────────────────────────────────────────────────────
-- 016 — Índices para admin_notifications
--
-- get_admin_unread_count() corre en cada carga del layout admin
-- (badge de la campana) y get_admin_notifications_for_user()
-- en la campana y en /admin/historial. Ambas filtran por
-- expires_at > now() y la lista ordena por created_at DESC.
-- La tabla viene del schema base (no versionado) y no tenía
-- índices para estas columnas, así que cada llamada escanea la
-- tabla completa, que crece con cada acción de los admins.
--
-- admin_notification_reads ya tiene UNIQUE (notification_id, user_id)
-- (lo usa el ON CONFLICT de mark_admin_notification_read), que cubre
-- el NOT EXISTS / LEFT JOIN de ambas funciones.
-- ─────────────────────────────────────────────────────────────

-- Lista de la campana / historial: últimas N notificaciones vigentes
CREATE INDEX IF NOT EXISTS idx_admin_notif_created
  ON admin_notifications (created_at DESC);

-- Conteo de no leídas: solo notificaciones no expiradas
CREATE INDEX IF NOT EXISTS idx_admin_notif_expires
  ON admin_notifications (expires_at);
