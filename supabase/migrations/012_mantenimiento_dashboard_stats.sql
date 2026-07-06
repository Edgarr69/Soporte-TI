-- Funciones de agregación SQL para el dashboard de mantenimiento
-- (mismo patrón que 009 para sistemas). El dashboard filtra por rango
-- de fechas en el cliente, así que se agrega POR DÍA: el payload queda
-- acotado por días × áreas/técnicos en vez de por número de solicitudes.
-- Ventana fija de 12 meses, igual que la query que reemplazan.

-- Resumen diario: conteos por estado y tipo + sumas para promedios
-- (el cliente calcula avg = sum/count sobre el rango elegido)
CREATE OR REPLACE FUNCTION get_mant_daily_summary()
RETURNS TABLE (
  day text,
  total bigint,
  pendiente bigint, en_revision bigint, asignado bigint,
  en_proceso bigint, terminado bigint, cancelado bigint,
  general bigint, maquinaria bigint,
  assign_sum bigint, assign_count bigint,
  resol_sum bigint, resol_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    to_char(created_at, 'YYYY-MM-DD'),
    count(*),
    count(*) FILTER (WHERE status = 'pendiente'),
    count(*) FILTER (WHERE status = 'en_revision'),
    count(*) FILTER (WHERE status = 'asignado'),
    count(*) FILTER (WHERE status = 'en_proceso'),
    count(*) FILTER (WHERE status = 'terminado'),
    count(*) FILTER (WHERE status = 'cancelado'),
    count(*) FILTER (WHERE type = 'general'),
    count(*) FILTER (WHERE type = 'maquinaria'),
    coalesce(sum(assignment_time_minutes), 0),
    count(assignment_time_minutes),
    coalesce(sum(resolution_time_minutes), 0),
    count(resolution_time_minutes)
  FROM maintenance_tickets
  WHERE created_at >= now() - interval '12 months'
  GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION get_mant_daily_by_area()
RETURNS TABLE (day text, name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_char(created_at, 'YYYY-MM-DD'), coalesce(area_name_snapshot, 'Sin área'), count(*)
  FROM maintenance_tickets
  WHERE created_at >= now() - interval '12 months'
  GROUP BY 1, 2 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION get_mant_daily_by_tecnico()
RETURNS TABLE (day text, name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_char(created_at, 'YYYY-MM-DD'), tecnico_nombre_snapshot, count(*)
  FROM maintenance_tickets
  WHERE created_at >= now() - interval '12 months'
    AND tecnico_nombre_snapshot IS NOT NULL
  GROUP BY 1, 2 ORDER BY 1;
$$;

-- Solo el cliente con service_role (uso server-side cacheado) puede ejecutarlas
REVOKE EXECUTE ON FUNCTION get_mant_daily_summary()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_mant_daily_by_area()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_mant_daily_by_tecnico() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION get_mant_daily_summary()    TO service_role;
GRANT EXECUTE ON FUNCTION get_mant_daily_by_area()    TO service_role;
GRANT EXECUTE ON FUNCTION get_mant_daily_by_tecnico() TO service_role;
