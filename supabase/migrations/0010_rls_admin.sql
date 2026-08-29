-- ---------------------------------------------------------------
-- Reescribe las políticas de RLS para el modelo admin + seller. Un admin
-- ve y edita todo; una seller ve y edita solo lo suyo (owner_id). Las
-- vendedoras no se ven entre sí: ninguna política compara contra un
-- owner_id que no sea auth.uid(), así que eso ya queda cubierto sin
-- necesidad de una regla explícita — ausencia de acceso, no una negación.
--
-- commissions, points_ledger y prospect_analysis se quedan de SOLO
-- LECTURA para todos, admin incluido — nunca tuvieron política de
-- escritura (el cliente no calcula ni escribe dinero, puntos ni análisis,
-- CLAUDE.md §3) y agregar "or is_admin()" a un with check aquí abriría
-- justo esa puerta. Solo se les agrega "or is_admin()" al using de select.
--
-- appointments_team_select (visibilidad de equipo) no se toca: es una
-- política permisiva adicional que no depende de owner_id: se combina con
-- OR junto con appointments_owner_all reescrita abajo, así que el admin
-- ya queda cubierto sin tocarla.
-- ---------------------------------------------------------------

-- ---------- tablas con una sola política "for all" ----------

drop policy if exists "contacts_owner_all" on contacts;
create policy "contacts_owner_all"
  on contacts for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

drop policy if exists "opportunities_owner_all" on opportunities;
create policy "opportunities_owner_all"
  on opportunities for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

drop policy if exists "tasks_owner_all" on tasks;
create policy "tasks_owner_all"
  on tasks for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

drop policy if exists "interactions_owner_all" on interactions;
create policy "interactions_owner_all"
  on interactions for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

drop policy if exists "clients_owner_all" on clients;
create policy "clients_owner_all"
  on clients for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

drop policy if exists "notifications_owner_all" on notifications;
create policy "notifications_owner_all"
  on notifications for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

-- ---------- appointments: misma regla de dueño, team_select intacta ----------

drop policy if exists "appointments_owner_all" on appointments;
create policy "appointments_owner_all"
  on appointments for all
  to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

-- ---------- solo lectura, sin escritura para nadie (ver nota de arriba) ----------

drop policy if exists "commissions_select_own" on commissions;
create policy "commissions_select_own"
  on commissions for select
  to authenticated
  using (owner_id = auth.uid() or is_admin());

drop policy if exists "points_ledger_select_own" on points_ledger;
create policy "points_ledger_select_own"
  on points_ledger for select
  to authenticated
  using (owner_id = auth.uid() or is_admin());

drop policy if exists "prospect_analysis_select_own" on prospect_analysis;
create policy "prospect_analysis_select_own"
  on prospect_analysis for select
  to authenticated
  using (owner_id = auth.uid() or is_admin());

-- ---------- profiles: cada quien ve/edita el suyo, admin ve/edita todos ----------

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  to authenticated
  using (auth.uid() = id or is_admin());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id or is_admin())
  with check (auth.uid() = id or is_admin());

-- RLS no distingue columnas dentro de una fila permitida: sin esto, una
-- vendedora que edita su propia fila (auth.uid() = id, verdadero) podría
-- meter role = 'admin' en el mismo UPDATE y la política de arriba lo
-- dejaría pasar, porque no sabe qué columnas cambiaron. Este trigger
-- rechaza el cambio de role si quien ejecuta no es admin, sin importar que
-- la fila sea la propia. No necesita security definer: is_admin() ya
-- resuelve su propia elevación de privilegios internamente.
--
-- auth.uid() is not null es obligatorio en la condición: sin sesión (SQL
-- Editor, service role, cualquier acceso directo a la base) auth.uid()
-- da null, is_admin() da false (nadie coincide con id = null), y el
-- trigger bloqueaba hasta la asignación del primer admin — huevo y
-- gallina, no hay forma de nombrar al primer admin si hace falta ya ser
-- admin para nombrarlo. Un acceso sin sesión ya es un contexto de
-- confianza total (ya evade RLS por completo), así que no tiene caso que
-- este trigger lo bloquee también: solo protege el camino del cliente
-- autenticado normal, que siempre trae un auth.uid() real.
create function prevent_role_self_promotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede cambiar el rol de un perfil.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_self_promotion on profiles;
create trigger trg_prevent_role_self_promotion
  before update on profiles
  for each row
  execute function prevent_role_self_promotion();
