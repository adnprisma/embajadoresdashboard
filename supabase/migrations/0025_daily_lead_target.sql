-- ---------------------------------------------------------------
-- Meta diaria de leads configurable por vendedora (AJUSTE 1).
--
-- daily_lead_target reemplaza el TASKS_PER_DAY fijo (10) que usaba
-- distributeIntoDays() en src/lib/weeklyPlan.ts — cada vendedora puede
-- tener una meta distinta, la fija un admin desde /equipo.
--
-- Tope superior a propósito (no solo > 0): un valor tecleado por error
-- (300, por ejemplo) generaría un plan absurdo y nadie se entera hasta que
-- la vendedora abre /plan-semanal. 50 al día ya es más de lo que cualquiera
-- va a marcar en la práctica.
--
-- Protección de columna: NO es un RPC nuevo. profiles_update_own
-- (redefinida en 0010_rls_admin.sql) ya deja a un admin actualizar
-- CUALQUIER fila de profiles — es el mismo permiso del que depende
-- prevent_role_self_promotion() para dejar que un admin cambie el role de
-- otra persona. Este trigger repite ese patrón exacto para
-- daily_lead_target: no abre ningún permiso nuevo, solo angosta esa
-- política ancha a una sola columna cuando quien actúa no es admin.
-- ---------------------------------------------------------------

alter table profiles
  add column daily_lead_target int not null default 10
  check (daily_lead_target between 1 and 50);

create function prevent_daily_lead_target_self_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.daily_lead_target is distinct from old.daily_lead_target
     and auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede cambiar la meta diaria de una vendedora.';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_daily_lead_target_self_edit
  before update on profiles
  for each row
  execute function prevent_daily_lead_target_self_edit();
