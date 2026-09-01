-- ---------------------------------------------------------------
-- NO CORRER hasta confirmar con 14-distribucion-valor-oportunidades.sql que
-- el reparto por etapa no tiene sorpresas. Aprobado en principio, pendiente
-- de ese vistazo:
--
--   - Ganadas (is_won)                 -> value_legacy va a closed_value.
--                                          estimated_value queda null (nunca
--                                          se capturó un estimado aparte).
--   - Perdidas (is_lost: churn/discarded) -> value_legacy va a estimated_value.
--                                          closed_value queda null (nunca se
--                                          cerró con dinero real).
--   - Abiertas (cualquier otra etapa)  -> value_legacy va a estimated_value.
--                                          closed_value queda null.
--
-- En las tres, value_legacy = 0 se trata como "nunca se llenó" -> null, no
-- como un cero real (OpportunityDialog coaccionaba el campo vacío a 0, así
-- que hoy son indistinguibles).
--
-- Corre primero el SELECT de verificación (antes), luego los tres UPDATE,
-- luego el SELECT final. value_legacy NO se toca ni se borra en este script
-- — sigue disponible para corregir por UPDATE si algo queda mal repartido.
-- ---------------------------------------------------------------

-- 1) Antes — cuántas filas por categoría van a tener estimated/closed nulos
-- después de la migración, antes de tocar nada.
select
  case when ps.is_won then 'ganada' when ps.is_lost then 'perdida' else 'abierta' end as categoria,
  count(*) as total,
  count(*) filter (where o.value_legacy = 0) as en_cero
from opportunities o
join pipeline_stages ps on ps.id = o.stage_id
group by 1;

-- 2) Migración por categoría
update opportunities o
set closed_value = nullif(o.value_legacy, 0),
    estimated_value = null
from pipeline_stages ps
where ps.id = o.stage_id and ps.is_won;

update opportunities o
set estimated_value = nullif(o.value_legacy, 0),
    closed_value = null
from pipeline_stages ps
where ps.id = o.stage_id and ps.is_lost;

update opportunities o
set estimated_value = nullif(o.value_legacy, 0),
    closed_value = null
from pipeline_stages ps
where ps.id = o.stage_id and not ps.is_won and not ps.is_lost;

-- 3) Después — verifica que cada fila tenga exactamente uno de los dos
-- (o ninguno si el original era null/0), nunca ambos.
select
  case when ps.is_won then 'ganada' when ps.is_lost then 'perdida' else 'abierta' end as categoria,
  count(*) as total,
  count(*) filter (where o.estimated_value is not null) as con_estimado,
  count(*) filter (where o.closed_value is not null) as con_cerrado,
  count(*) filter (where o.estimated_value is not null and o.closed_value is not null) as con_ambos_revisar
from opportunities o
join pipeline_stages ps on ps.id = o.stage_id
group by 1;
