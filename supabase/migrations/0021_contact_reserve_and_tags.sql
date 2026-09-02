-- ---------------------------------------------------------------
-- Banco de reserva + etiquetas operativas en lote.
--
-- in_reserve: eje aparte del estado del contacto a propósito — un contacto
-- en reserva sigue "sin contactar" hasta que se reparte, y su estado se
-- mueve por su cuenta cuando le toque trabajarlo. Meterlo como un séptimo
-- estado habría significado acordarse de dos cambios (estado + dueño) al
-- repartir, y eso es justo lo que se olvida.
--
-- Los 351 actuales (todos owner_id = Prisma admin, todos sin_contactar,
-- confirmado con SELECT antes de escribir esto) entran marcados.
--
-- bulk_add_tag: para el barrido masivo de "sin teléfono ni correo" sobre
-- el lote de reserva — sin esto habría que abrir 193 fichas una por una.
-- ---------------------------------------------------------------

alter table contacts add column in_reserve boolean not null default false;

update contacts
set in_reserve = true
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f';

-- ---------- reassign_contacts: repartir saca de reserva ----------
-- p_to_owner ya está obligado a tener role = 'seller' (chequeo más abajo,
-- sin cambios) — toda reasignación es "a una vendedora" por definición, así
-- que in_reserve pasa a false sin condición, en el mismo UPDATE que mueve
-- owner_id. Si hubiera que hacerlo aparte, algún día alguien va a mover el
-- dueño y olvidar la reserva.
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

    update contacts set owner_id = p_to_owner, in_reserve = false where id = v_contact_id;
    update prospect_analysis set owner_id = p_to_owner where contact_id = v_contact_id;
    update tasks set owner_id = p_to_owner where contact_id = v_contact_id;
    update opportunities set owner_id = p_to_owner where contact_id = v_contact_id;
    update appointments set owner_id = p_to_owner where contact_id = v_contact_id;

    insert into contact_assignments (contact_id, from_owner, to_owner, assigned_by, reason)
    values (v_contact_id, v_from_owner, p_to_owner, v_assigned_by, p_reason);

    v_moved_count := v_moved_count + 1;
  end loop;

  return v_moved_count;
end;
$$;

-- ---------- import_contacts: reserva por defecto si el destino es admin ----------
-- p_in_reserve es del LOTE completo, no por fila — el diálogo de
-- importación decide una vez, no contacto por contacto. Si no se pasa
-- (llamada vieja, o desde el editor SQL), cae al default: reserva si el
-- destino es admin, en circulación si es una vendedora directa — mismo
-- criterio que el checkbox de la UI, para que una llamada sin ese
-- parámetro no se comporte distinto a como se ve en pantalla.
create or replace function import_contacts(
  p_contacts jsonb,
  p_owner uuid default null,
  p_reason text default null,
  p_assigned_by uuid default null,
  p_in_reserve boolean default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned_by uuid := coalesce(auth.uid(), p_assigned_by);
  v_owner uuid := coalesce(p_owner, v_assigned_by);
  v_owner_is_admin boolean;
  v_in_reserve boolean;
  v_contact jsonb;
  v_new_id uuid;
  v_count int := 0;
begin
  if v_assigned_by is null then
    raise exception 'No hay sesión activa y no se pasó p_assigned_by: no se puede determinar quién firma esta importación.';
  end if;

  if auth.uid() is not null and v_owner <> auth.uid() and not is_admin() then
    raise exception 'Solo un admin puede importar contactos a nombre de otra persona.';
  end if;

  select role = 'admin' into v_owner_is_admin from profiles where id = v_owner;

  if v_owner_is_admin is null then
    raise exception 'El destino (%) no existe.', v_owner;
  end if;

  v_in_reserve := coalesce(p_in_reserve, v_owner_is_admin);

  if p_contacts is null or jsonb_array_length(p_contacts) = 0 then
    return 0;
  end if;

  for v_contact in select * from jsonb_array_elements(p_contacts)
  loop
    insert into contacts (owner_id, business_name, contact_name, phone, email, industry, tags, notes, in_reserve)
    values (
      v_owner,
      v_contact->>'business_name',
      v_contact->>'contact_name',
      v_contact->>'phone',
      v_contact->>'email',
      v_contact->>'industry',
      coalesce(
        (select array_agg(tag) from jsonb_array_elements_text(coalesce(v_contact->'tags', '[]'::jsonb)) tag),
        array[]::text[]
      ),
      v_contact->>'notes',
      v_in_reserve
    )
    returning id into v_new_id;

    insert into contact_assignments (contact_id, from_owner, to_owner, assigned_by, reason)
    values (v_new_id, null, v_owner, v_assigned_by, coalesce(p_reason, 'Importación'));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------- bulk_add_tag: aplicar una etiqueta operativa a varios a la vez ----------
-- Solo agrega — nunca se pidió un "quitar en lote", y no hay que
-- construirlo hasta que haga falta. Idempotente (el filtro "not (p_tag =
-- any(tags))" salta los que ya la tienen) y respeta el mismo dueño que
-- cualquier UPDATE directo del cliente respetaría por RLS — se replica a
-- mano porque, al ser SECURITY DEFINER, RLS no aplica dentro de la función.
create function bulk_add_tag(
  p_contact_ids uuid[],
  p_tag text,
  p_added_by uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := coalesce(auth.uid(), p_added_by);
  v_count int;
begin
  if v_owner is null then
    raise exception 'No hay sesión activa y no se pasó p_added_by: no se puede determinar quién firma este cambio.';
  end if;

  if p_contact_ids is null or array_length(p_contact_ids, 1) is null then
    return 0;
  end if;

  update contacts
  set tags = array_append(tags, p_tag)
  where id = any(p_contact_ids)
    and (owner_id = v_owner or is_admin())
    and not (p_tag = any(tags));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
