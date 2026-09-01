-- ---------------------------------------------------------------
-- Arregla la atribución histórica de interactions antes de construir el
-- embudo semanal (bloque 3). reassign_contacts() reescribía
-- interactions.owner_id de TODO el historial del contacto al dueño nuevo —
-- necesario para que la vendedora nueva siguiera viendo la línea de tiempo
-- completa (RLS dependía de esa misma columna), pero de paso borraba quién
-- hizo cada cambio realmente. Un embudo construido sobre esa columna le
-- robaría el trabajo a quien lo hizo y se lo daría a quien se quedó con el
-- contacto después.
--
-- La corrección separa las dos cosas que esa columna hacía a la vez:
--   - Visibilidad ("¿puedo ver esta fila?") pasa a resolverse por el dueño
--     ACTUAL del contacto (join a contacts), no por interactions.owner_id.
--   - interactions.owner_id deja de tocarse en reassign_contacts() y queda
--     como lo que siempre debió ser: quién generó la fila, para siempre.
--
-- El INSERT (with check) NO se toca: sigue exigiendo owner_id = auth.uid()
-- (o is_admin()) al momento de crear la fila — eso ya era correcto.
-- ---------------------------------------------------------------

-- Índice que faltaba en interactions.contact_id — barato ahora, caro con
-- miles de filas. La ficha de contacto ya filtra por contact_id, y la
-- política nueva de abajo hace un exists() correlacionado por esta columna.
create index on interactions (contact_id);

drop policy if exists "interactions_owner_all" on interactions;
create policy "interactions_owner_all"
  on interactions for all
  to authenticated
  using (
    exists (
      select 1 from contacts c
      where c.id = interactions.contact_id
        and (c.owner_id = auth.uid() or is_admin())
    )
  )
  with check (owner_id = auth.uid() or is_admin());

create or replace function reassign_contacts(
  p_contact_ids uuid[],
  p_to_owner uuid,
  p_reason text default null,
  p_assigned_by uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
  v_from_owner uuid;
  v_assigned_by uuid := coalesce(auth.uid(), p_assigned_by);
  v_moved_count int := 0;
begin
  if auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede reasignar contactos.';
  end if;

  if v_assigned_by is null then
    raise exception 'No hay sesión activa y no se pasó p_assigned_by: no se puede determinar quién firma esta reasignación.';
  end if;

  if not exists (select 1 from profiles where id = p_to_owner and role = 'seller') then
    raise exception 'El destino (%) no existe o no tiene rol seller.', p_to_owner;
  end if;

  if p_contact_ids is null or array_length(p_contact_ids, 1) is null then
    return 0;
  end if;

  foreach v_contact_id in array p_contact_ids
  loop
    select owner_id into v_from_owner from contacts where id = v_contact_id;

    if not found then
      continue; -- contacto inexistente: se salta, no aborta el lote
    end if;

    if v_from_owner = p_to_owner then
      continue; -- ya es suyo, no hay movimiento real que registrar
    end if;

    update contacts set owner_id = p_to_owner where id = v_contact_id;
    update prospect_analysis set owner_id = p_to_owner where contact_id = v_contact_id;
    update tasks set owner_id = p_to_owner where contact_id = v_contact_id;
    -- interactions YA NO se reescribe (ver comentario arriba del archivo):
    -- owner_id se queda como atribución histórica real. La vendedora nueva
    -- sigue viendo el historial completo porque la política de RLS ahora
    -- resuelve la visibilidad por el dueño actual del contacto.
    update opportunities set owner_id = p_to_owner where contact_id = v_contact_id;
    update appointments set owner_id = p_to_owner where contact_id = v_contact_id;

    insert into contact_assignments (contact_id, from_owner, to_owner, assigned_by, reason)
    values (v_contact_id, v_from_owner, p_to_owner, v_assigned_by, p_reason);

    v_moved_count := v_moved_count + 1;
  end loop;

  return v_moved_count;
end;
$$;
