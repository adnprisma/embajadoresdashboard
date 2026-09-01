-- ---------------------------------------------------------------
-- Corre esto DESPUÉS de aplicar 0016_opportunity_value_split.sql.
-- Muestra cómo está repartido value_legacy hoy, por etapa y con cuántos en
-- cero, para decidir con datos reales el reparto de
-- 15-migra-valor-oportunidades.sql antes de correrlo.
-- ---------------------------------------------------------------

select
  o.stage_id,
  ps.name as etapa,
  ps.is_won,
  ps.is_lost,
  count(*) as total,
  count(*) filter (where o.value_legacy = 0) as en_cero,
  count(*) filter (where o.value_legacy > 0) as con_monto
from opportunities o
join pipeline_stages ps on ps.id = o.stage_id
group by o.stage_id, ps.name, ps.is_won, ps.is_lost, ps.position
order by ps.position;
