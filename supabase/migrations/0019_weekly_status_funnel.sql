-- ---------------------------------------------------------------
-- Bloque 3 — embudo semanal. Un solo RPC, reutilizado por dos pantallas:
-- /equipo (admin, todas las vendedoras) y el bloque de "tu ritmo esta
-- semana" en el dashboard de cada vendedora (solo lo propio).
--
-- p_weeks_ago: 0 = semana en curso, 1 = la anterior — el cliente llama dos
-- veces para comparar contra uno mismo. Semana = date_trunc('week', ...),
-- que en Postgres ya arranca en lunes (ISO 8601), igual que el resto del
-- proyecto. No se recibe ninguna fecha del cliente a propósito, para no
-- depender de coincidencias de huso horario entre navegador y servidor.
--
-- count(distinct contact_id): un contacto que va y viene entre estados
-- varias veces en la semana cuenta UNA vez por estado alcanzado, no una vez
-- por evento — contar filas premiaría el manoseo, no el trabajo real.
--
-- to_status <> 'sin_contactar': ver FUNNEL_STATUSES en
-- src/config/contactStatus.ts, la misma exclusión en el cliente.
--
-- Admin ve el equipo completo; una vendedora sólo lo propio, sin
-- excepción — misma regla de alcance por tipo de pantalla que /dinero y
-- /tareas (CLAUDE.md §3). Esta función es SECURITY DEFINER y filtra sola,
-- no depende de RLS de interactions para decidir qué fila entra en el
-- reporte.
-- ---------------------------------------------------------------

create or replace function weekly_status_funnel(p_weeks_ago int default 0)
returns table (owner_id uuid, to_status text, contact_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_week_start timestamptz;
  v_week_end timestamptz;
begin
  if v_caller is null then
    raise exception 'No autenticado';
  end if;

  v_week_start := date_trunc('week', now()) - make_interval(weeks => p_weeks_ago);
  v_week_end := v_week_start + interval '7 days';

  return query
  select
    i.owner_id,
    i.to_status,
    count(distinct i.contact_id) as contact_count
  from interactions i
  where i.kind = 'status_change'
    and i.to_status is not null
    and i.to_status <> 'sin_contactar'
    and i.occurred_at >= v_week_start
    and i.occurred_at < v_week_end
    and (is_admin() or i.owner_id = v_caller)
  group by i.owner_id, i.to_status;
end;
$$;
