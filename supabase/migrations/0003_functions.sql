-- ---------------------------------------------------------------
-- Prisma dashboard — funciones RPC
-- Ver context/ROADMAP.md §4.3.
--
-- Reglas de esta migración, sin excepción:
--   * language plpgsql security definer set search_path = public
--   * cada función resuelve el usuario con auth.uid() internamente.
--     Ninguna función acepta un user_id/owner_id como parámetro: así un
--     cliente autenticado no puede pedir datos de otra persona ni siquiera
--     por error de integración.
--   * revoke/grant al final: solo el rol `authenticated` puede ejecutarlas.
--
-- Varias fórmulas (show_rate, close_rate, volume_month del pipeline, y qué
-- significa "streak" en my_rank) no están definidas en context/ROADMAP.md.
-- Cada una queda documentada con la interpretación que usé — son PROPUESTA,
-- no un hecho de negocio confirmado.
-- ---------------------------------------------------------------

-- ---------- my_wallet_summary ----------
create or replace function my_wallet_summary()
returns table (available bigint, locked bigint, total bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  return query
  select
    coalesce(sum(amount) filter (where status = 'available'), 0) as available,
    coalesce(sum(amount) filter (where status = 'locked'), 0) as locked,
    coalesce(sum(amount), 0) as total
  from points_ledger
  where owner_id = v_owner;
end;
$$;

-- ---------- my_wallet_history ----------
create or replace function my_wallet_history(p_from date, p_to date)
returns setof points_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  return query
  select *
  from points_ledger
  where owner_id = v_owner
    and created_at::date between p_from and p_to
  order by created_at desc;
end;
$$;

-- ---------- my_rank ----------
-- "points" = balance vigente (available + locked), igual que my_wallet_summary.total.
-- "streak": el esquema actual no registra rachas (no hay columna ni tabla que
-- las respalde). Devuelve 0 hasta que se defina qué mide exactamente
-- (¿meses seguidos con comisión? ¿semanas con actividad?) — PROPUESTA pendiente.
create or replace function my_rank()
returns table (
  "position" bigint,
  total_users bigint,
  points bigint,
  rank_id text,
  streak int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  return query
  with totals as (
    select
      pr.id,
      coalesce(pts.points, 0) as points
    from profiles pr
    left join (
      select owner_id, sum(amount) as points
      from points_ledger
      where status in ('available', 'locked')
      group by owner_id
    ) pts on pts.owner_id = pr.id
  ),
  ranked as (
    select
      id,
      points,
      rank() over (order by points desc) as position,
      count(*) over () as total_users
    from totals
  )
  select
    r.position,
    r.total_users,
    r.points,
    (
      select rk.id
      from ranks rk
      where rk.min_points <= r.points
      order by rk.min_points desc
      limit 1
    ) as rank_id,
    0 as streak
  from ranked r
  where r.id = v_owner;
end;
$$;

-- ---------- leaderboard ----------
-- Nunca selecciona profiles.email. "alias" no existe como columna propia en
-- profiles (no hay apodo/nickname en el esquema) — se usa full_name como
-- nombre para mostrar, con un genérico si viene vacío. p_period acepta
-- 'week' | 'month' | 'year' | 'all' (cualquier otro valor se trata como 'all').
create or replace function leaderboard(p_period text default 'all')
returns table (
  profile_id uuid,
  display_name text,
  points bigint,
  rank_position bigint,
  is_me boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
begin
  v_from := case p_period
    when 'week' then date_trunc('week', now())
    when 'month' then date_trunc('month', now())
    when 'year' then date_trunc('year', now())
    else '-infinity'::timestamptz
  end;

  return query
  with totals as (
    select
      pr.id as profile_id,
      coalesce(nullif(trim(pr.full_name), ''), 'Usuario Prisma') as display_name,
      coalesce(sum(pl.amount) filter (where pl.status in ('available', 'locked')), 0) as points
    from profiles pr
    left join points_ledger pl
      on pl.owner_id = pr.id
      and pl.created_at >= v_from
    group by pr.id, pr.full_name
  )
  select
    t.profile_id,
    t.display_name,
    t.points,
    rank() over (order by t.points desc) as rank_position,
    t.profile_id = auth.uid() as is_me
  from totals t
  order by t.points desc
  limit 50;
end;
$$;

-- ---------- my_dashboard_summary ----------
-- Una sola llamada para todo el dashboard (§10.1). "sales" reutiliza las
-- mismas definiciones de new_month/closes_month/close_rate que
-- my_pipeline_metrics, para no tener dos fórmulas distintas de lo mismo.
create or replace function my_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_month_start date := date_trunc('month', current_date)::date;
  v_month_start_ts timestamptz := date_trunc('month', now());
  v_result jsonb;
begin
  if v_owner is null then
    raise exception 'No autenticado';
  end if;

  with
  base_opportunities as (
    select o.*, ps.is_won, ps.is_lost
    from opportunities o
    join pipeline_stages ps on ps.id = o.stage_id
    where o.owner_id = v_owner
  ),
  stats as (
    select
      (select coalesce(sum(amount), 0) from commissions
        where owner_id = v_owner and period = v_month_start) as earned_this_month,
      (select count(*) from clients
        where owner_id = v_owner and status = 'active') as active_clients,
      (select coalesce(sum(mrr), 0) from clients
        where owner_id = v_owner and status = 'active') as mrr
  ),
  ranking as (
    select r.position, r.total_users
    from (
      select
        pr.id,
        rank() over (order by coalesce(pts.points, 0) desc) as position,
        count(*) over () as total_users
      from profiles pr
      left join (
        select owner_id, sum(amount) as points
        from points_ledger
        where status in ('available', 'locked')
        group by owner_id
      ) pts on pts.owner_id = pr.id
    ) r
    where r.id = v_owner
  ),
  commission_status as (
    select coalesce(jsonb_object_agg(status, row), '{}'::jsonb) as by_status
    from (
      select
        status,
        jsonb_build_object(
          'amount', coalesce(sum(amount), 0),
          'count', count(*),
          'is_estimate', bool_or(is_estimate)
        ) as row
      from commissions
      where owner_id = v_owner and period = v_month_start
      group by status
    ) s
  ),
  sales as (
    select
      count(*) filter (where created_at >= v_month_start_ts) as new_month,
      count(*) filter (where is_won and closed_at >= v_month_start_ts) as closes_month,
      case
        when count(*) filter (where closed_at >= v_month_start_ts and (is_won or is_lost)) = 0 then 0
        else round(
          100.0 * count(*) filter (where closed_at >= v_month_start_ts and is_won)
          / count(*) filter (where closed_at >= v_month_start_ts and (is_won or is_lost)),
          1
        )
      end as close_rate
    from base_opportunities
  ),
  chart_series as (
    select coalesce(jsonb_agg(
      jsonb_build_object('month', to_char(m.month, 'YYYY-MM'), 'amount', coalesce(c.amount, 0))
      order by m.month
    ), '[]'::jsonb) as series
    from (
      select date_trunc('month', current_date) - (n || ' months')::interval as month
      from generate_series(0, 5) as n
    ) m
    left join (
      select period, sum(amount) as amount
      from commissions
      where owner_id = v_owner
      group by period
    ) c on c.period = m.month::date
  ),
  recent_commissions as (
    select coalesce(jsonb_agg(row), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'id', cm.id,
        'concept', cm.concept,
        'amount', cm.amount,
        'status', cm.status,
        'is_estimate', cm.is_estimate,
        'client_name', cl.name,
        'period', cm.period
      ) as row
      from commissions cm
      left join clients cl on cl.id = cm.client_id
      where cm.owner_id = v_owner
      order by cm.period desc, cm.id desc
      limit 5
    ) s
  ),
  upcoming_renewals as (
    select coalesce(jsonb_agg(row), '[]'::jsonb) as items
    from (
      select jsonb_build_object(
        'id', cl.id,
        'name', cl.name,
        'mrr', cl.mrr,
        'next_renewal', cl.next_renewal
      ) as row
      from clients cl
      where cl.owner_id = v_owner
        and cl.status = 'active'
        and cl.next_renewal is not null
        and cl.next_renewal >= current_date
      order by cl.next_renewal asc
      limit 5
    ) s
  )
  select jsonb_build_object(
    'earned_this_month', stats.earned_this_month,
    'active_clients', stats.active_clients,
    'mrr', stats.mrr,
    'ranking', jsonb_build_object(
      'position', ranking.position,
      'total_users', ranking.total_users
    ),
    'commission_status', commission_status.by_status,
    'sales', jsonb_build_object(
      'new_month', sales.new_month,
      'closes_month', sales.closes_month,
      'close_rate', sales.close_rate
    ),
    'chart_series', chart_series.series,
    'recent_commissions', recent_commissions.items,
    'upcoming_renewals', upcoming_renewals.items
  )
  into v_result
  from stats, ranking, commission_status, sales, chart_series, recent_commissions, upcoming_renewals;

  return v_result;
end;
$$;

-- ---------- my_pipeline_metrics ----------
-- show_rate = show / (show + no_show) del mes, usando updated_at como proxy
-- de "cuándo cambió de etapa" (no hay bitácora de transiciones en el esquema).
-- close_rate = won / (won + lost) del mes, por closed_at.
-- volume_month = valor de las oportunidades ganadas (is_won) cerradas este mes.
-- Las tres son PROPUESTA de fórmula, no una definición confirmada.
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
    (select coalesce(sum(value), 0) from base where is_won and closed_at >= v_month_start) as volume_month,
    (select count(*) from base where is_won and closed_at >= v_month_start) as closes_month;
end;
$$;

-- ---------- mark_tour_seen ----------
create or replace function mark_tour_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  update profiles
  set tour_seen = true
  where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------
-- Solo `authenticated` puede ejecutar estas funciones. Se revoca el
-- privilegio por defecto de PUBLIC (que en Supabase alcanza a `anon`).
-- ---------------------------------------------------------------

revoke execute on function my_wallet_summary() from public;
grant execute on function my_wallet_summary() to authenticated;

revoke execute on function my_wallet_history(date, date) from public;
grant execute on function my_wallet_history(date, date) to authenticated;

revoke execute on function my_rank() from public;
grant execute on function my_rank() to authenticated;

revoke execute on function leaderboard(text) from public;
grant execute on function leaderboard(text) to authenticated;

revoke execute on function my_dashboard_summary() from public;
grant execute on function my_dashboard_summary() to authenticated;

revoke execute on function my_pipeline_metrics() from public;
grant execute on function my_pipeline_metrics() to authenticated;

revoke execute on function mark_tour_seen() from public;
grant execute on function mark_tour_seen() to authenticated;
