-- ---------------------------------------------------------------
-- Cierra un hueco del bloque 2: bloqueamos mover/editar una oportunidad
-- ganada para proteger closed_value, pero el menú de la tarjeta seguía
-- ofreciendo "Eliminar oportunidad" sin ninguna validación — borrar destruye
-- más que mover, y no deja rastro. Corregir o borrar un cierre ya
-- registrado es una corrección contable: SQL directo, no interfaz. Misma
-- regla que closed_value (0016_opportunity_value_split.sql).
--
-- Dos capas, no una sola:
--
-- 1) delete_opportunity() (RPC): lo que usa la app. Rechaza con un mensaje
--    claro si la oportunidad ya está ganada — mismo patrón que
--    update_opportunity_stage().
--
-- 2) Política RESTRICTIVE de RLS en DELETE: cierra el borrado directo vía
--    REST (`.from("opportunities").delete()` o cualquier llamada que se
--    salte el RPC), que hoy pasa sin validar nada porque
--    "opportunities_owner_all" permite DELETE con solo `owner_id =
--    auth.uid() or is_admin()`. Una política RESTRICTIVE se combina con AND
--    sobre las permissive existentes, así que el DELETE solo procede si
--    además NO es una etapa ganada.
--
--    Esta capa no le aplica a la sesión de service_role/postgres del editor
--    SQL de Supabase (RLS se ignora para roles con BYPASSRLS, que es como
--    corre el editor) — el camino de "corrección por SQL directo" sigue
--    abierto sin ninguna maniobra especial, igual que closed_value.
--
-- Se revisó si hay otra puerta trasera: contacts.opportunity_id... no,
-- opportunities.contact_id -> contacts(id) es ON DELETE SET NULL (no
-- cascada) — borrar el contacto dueño de una oportunidad ganada NO la
-- arrastra, solo la desvincula. opportunities.owner_id -> profiles(id) SÍ es
-- ON DELETE CASCADE, pero hoy no existe ninguna función para borrar un
-- profile en la app (grep sin resultados) — solo alcanzable por SQL directo,
-- que es la vía sancionada. Si algún día se agrega un "eliminar seller",
-- necesita su propio chequeo antes de existir.
-- ---------------------------------------------------------------

create policy "opportunities_no_delete_won"
on opportunities
as restrictive
for delete
using (
  not exists (
    select 1 from pipeline_stages ps
    where ps.id = opportunities.stage_id and ps.is_won
  )
);

create or replace function delete_opportunity(
  p_opportunity_id uuid,
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
    raise exception 'Esta oportunidad ya está Ganada: no se puede eliminar desde la interfaz. Borrar un cierre ya registrado es una corrección contable — se hace por SQL directo.';
  end if;

  delete from opportunities where id = p_opportunity_id;
end;
$$;
