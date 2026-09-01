-- ---------------------------------------------------------------
-- Bloque 2: separa "lo que se cree que se va a vender" (estimado) de "lo
-- que realmente se vendió" (cerrado). Un solo campo `value` mezclaba las
-- dos cosas: poner 27,000 al abrir y cerrar en 15,000 dejaba el pronóstico
-- mintiendo y el historial perdido.
--
-- `value` se renombra a `value_legacy` en vez de eliminarse. La migración de
-- datos (qué fila va a estimated_value y cuál a closed_value, según etapa)
-- corre por separado — ver supabase/test-data/15-migra-valor-oportunidades.sql
-- — después de revisar la distribución real en pantalla. Con la columna
-- vieja presente, un error de reparto se corrige con un UPDATE; sin ella
-- habría que reconstruirla de memoria. `value_legacy` se elimina en una
-- migración posterior, una vez confirmado que nada quedó mal repartido.
-- ---------------------------------------------------------------

alter table opportunities rename column value to value_legacy;
alter table opportunities add column estimated_value numeric(12,2);
alter table opportunities add column closed_value numeric(12,2);

-- ---------- update_opportunity_stage ----------
-- Única forma de cambiar de etapa una oportunidad — reemplaza la escritura
-- directa que hacía el cliente (`useUpdateOpportunityStage`). Desde ahora
-- mover a una etapa is_won exige capturar closed_value, y esa validación no
-- puede vivir en el formulario (CLAUDE.md §3: "el cliente nunca calcula ni
-- escribe dinero").
--
-- Ganar es terminal: una oportunidad que ya está en una etapa is_won
-- rechaza cualquier intento de moverla, en cualquier dirección, desde aquí
-- — no solo desde la UI. Así no hay forma de arrastrarla por error, que
-- "rebote" a otra columna, y dejarla sin poder volver a cerrarse nunca
-- desde la interfaz. Corregir un cierre equivocado es una corrección
-- contable (SQL directo sobre closed_value), no un movimiento de tablero.
create or replace function update_opportunity_stage(
  p_opportunity_id uuid,
  p_stage_id text,
  p_closed_value numeric default null,
  p_changed_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := coalesce(auth.uid(), p_changed_by);
  v_opp record;
  v_target record;
begin
  if v_owner is null then
    raise exception 'No hay sesión activa y no se pasó p_changed_by: no se puede determinar quién firma este cambio.';
  end if;

  select o.*, ps.is_won as current_is_won
  into v_opp
  from opportunities o
  join pipeline_stages ps on ps.id = o.stage_id
  where o.id = p_opportunity_id
    and (o.owner_id = v_owner or is_admin());

  if not found then
    raise exception 'La oportunidad % no existe o no pertenece a este usuario.', p_opportunity_id;
  end if;

  if v_opp.current_is_won then
    raise exception 'Esta oportunidad ya está Ganada. Ganar es un estado terminal: no se puede mover desde la interfaz. Una corrección de cierre se hace por SQL directo.';
  end if;

  select * into v_target from pipeline_stages where id = p_stage_id;
  if not found then
    raise exception 'La etapa % no existe.', p_stage_id;
  end if;

  if v_target.is_won and p_closed_value is null then
    raise exception 'Para marcar como Ganada hace falta capturar el valor cerrado.';
  end if;

  update opportunities
  set stage_id = p_stage_id,
      closed_at = case when v_target.is_won or v_target.is_lost then now() else null end,
      closed_value = case when v_target.is_won then p_closed_value else closed_value end
  where id = p_opportunity_id;
end;
$$;

-- ---------- my_pipeline_metrics: volume_month lee closed_value ----------
-- Antes sumaba `value` (mezclado). Ya filtraba por is_won, así que
-- semánticamente no cambia — solo la columna fuente. Hasta que corra la
-- migración de datos, closed_value es null en todo lo ya ganado y
-- volume_month mostrará $0 real (no un bug: es la ventana entre este
-- deploy y el backfill, avisada aparte).
create or replace function my_pipeline_metrics()
returns table (
  new_month bigint,
  analyses bigint,
  show_rate numeric,
  close_rate numeric,
  volume_month numeric,
  closes_month bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_month_start timestamptz := date_trunc('month', now());
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  return query
  with base as (
    select o.*, ps.is_won, ps.is_lost
    from opportunities o
    join pipeline_stages ps on ps.id = o.stage_id
    where o.owner_id = v_owner
  )
  select
    (select count(*) from base where created_at >= v_month_start) as new_month,
    (select count(*) from base where stage_id = 'analysis') as analyses,
    (
      select case
        when count(*) filter (where stage_id in ('show', 'no_show') and updated_at >= v_month_start) = 0 then 0
        else round(
          100.0 * count(*) filter (where stage_id = 'show' and updated_at >= v_month_start)
          / count(*) filter (where stage_id in ('show', 'no_show') and updated_at >= v_month_start),
          1
        )
      end
      from base
    ) as show_rate,
    (
      select case
        when count(*) filter (where closed_at >= v_month_start and (is_won or is_lost)) = 0 then 0
        else round(
          100.0 * count(*) filter (where closed_at >= v_month_start and is_won)
          / count(*) filter (where closed_at >= v_month_start and (is_won or is_lost)),
          1
        )
      end
      from base
    ) as close_rate,
    (select coalesce(sum(closed_value), 0) from base where is_won and closed_at >= v_month_start) as volume_month,
    (select count(*) from base where is_won and closed_at >= v_month_start) as closes_month;
end;
$$;
