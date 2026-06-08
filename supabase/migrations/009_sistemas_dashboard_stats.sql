-- Funciones de agregación SQL para dashboard y reportes de sistemas
-- Reemplazan el cálculo en JS sobre el listado completo de tickets

CREATE OR REPLACE FUNCTION get_sistemas_ticket_summary()
RETURNS TABLE (
  total bigint,
  abierto bigint, en_proceso bigint, en_espera bigint,
  resuelto bigint, cerrado bigint, reabierto bigint,
  critica bigint, alta bigint, media bigint, baja bigint,
  reopened_count bigint,
  avg_first_response numeric,
  avg_resolution numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'abierto'),
    count(*) FILTER (WHERE status = 'en_proceso'),
    count(*) FILTER (WHERE status = 'en_espera'),
    count(*) FILTER (WHERE status = 'resuelto'),
    count(*) FILTER (WHERE status = 'cerrado'),
    count(*) FILTER (WHERE status = 'reabierto'),
    count(*) FILTER (WHERE priority = 'critica'),
    count(*) FILTER (WHERE priority = 'alta'),
    count(*) FILTER (WHERE priority = 'media'),
    count(*) FILTER (WHERE priority = 'baja'),
    count(*) FILTER (WHERE is_reopened),
    round(avg(first_response_time_minutes)),
    round(avg(resolution_time_minutes))
  FROM tickets;
$$;

CREATE OR REPLACE FUNCTION get_sistemas_by_category()
RETURNS TABLE (name text, total bigint, critica bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(c.name, 'Sin categoría'), count(*), count(*) FILTER (WHERE t.priority = 'critica')
  FROM tickets t LEFT JOIN ticket_categories c ON c.id = t.category_id
  GROUP BY c.name ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION get_sistemas_by_department()
RETURNS TABLE (name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(d.name, 'Sin depto.'), count(*)
  FROM tickets t LEFT JOIN departments d ON d.id = t.department_id
  GROUP BY d.name ORDER BY count(*) DESC;
$$;

CREATE OR REPLACE FUNCTION get_sistemas_by_month()
RETURNS TABLE (month text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_char(created_at, 'YYYY-MM'), count(*)
  FROM tickets GROUP BY 1 ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION get_sistemas_top_users(p_limit int DEFAULT 10)
RETURNS TABLE (email text, full_name text, total bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.email, p.full_name, count(*)
  FROM tickets t JOIN profiles p ON p.id = t.user_id
  GROUP BY p.email, p.full_name ORDER BY count(*) DESC LIMIT p_limit;
$$;

-- Solo el cliente con service_role (uso server-side cacheado) puede ejecutarlas
REVOKE EXECUTE ON FUNCTION get_sistemas_ticket_summary()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_sistemas_by_category()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_sistemas_by_department()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_sistemas_by_month()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_sistemas_top_users(int)        FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION get_sistemas_ticket_summary()      TO service_role;
GRANT EXECUTE ON FUNCTION get_sistemas_by_category()         TO service_role;
GRANT EXECUTE ON FUNCTION get_sistemas_by_department()       TO service_role;
GRANT EXECUTE ON FUNCTION get_sistemas_by_month()            TO service_role;
GRANT EXECUTE ON FUNCTION get_sistemas_top_users(int)        TO service_role;
