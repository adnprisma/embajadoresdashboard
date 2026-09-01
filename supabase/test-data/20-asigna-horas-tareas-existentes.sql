-- ---------------------------------------------------------------
-- Corre DESPUÉS de 0020_task_status.sql. Las tareas existentes tienen
-- due_at a medianoche (solo fecha, nunca hora real). Les asigna una: agrupa
-- por día calendario (America/Mexico_City), ordena por created_at dentro
-- del día, y reparte cada 30 minutos desde las 9:00 a.m. — mismo criterio
-- que usa el generador de plan semanal (weeklyPlan.ts) para las tareas
-- nuevas, para no tener dos reglas distintas conviviendo. Es un punto de
-- partida editable, no una agenda real.
-- ---------------------------------------------------------------

-- 1) Antes
select t.id, c.business_name, t.due_at
from tasks t
left join contacts c on c.id = t.contact_id
where t.due_at is not null
order by t.due_at;

-- 2) Reparto
with ranked as (
  select
    id,
    (due_at at time zone 'America/Mexico_City')::date as due_date,
    row_number() over (
      partition by (due_at at time zone 'America/Mexico_City')::date
      order by created_at
    ) as rn
  from tasks
  where due_at is not null
)
update tasks t
set due_at = (
  (r.due_date + time '09:00' + ((r.rn - 1) * interval '30 minutes')) at time zone 'America/Mexico_City'
)
from ranked r
where t.id = r.id;

-- 3) Después
select t.id, c.business_name, t.due_at
from tasks t
left join contacts c on c.id = t.contact_id
where t.due_at is not null
order by t.due_at;
