-- ---------------------------------------------------------------
-- import_contacts: crea contactos nuevos con un owner explícito, validado
-- en el servidor — igual que reassign_contacts(), la decisión de "a nombre
-- de quién" nunca la toma el cliente.
--
-- Antes de esto, ImportDialog hacía un INSERT directo desde el cliente con
-- owner_id = auth.uid(): quien importaba se quedaba siempre como dueño,
-- sin forma de asignar a otra persona sin una reasignación manual después
-- (así se cargaron los primeros 104 leads, con dos rondas de
-- reassign_contacts() desde el SQL Editor). Con un selector "Asignar a" en
-- el diálogo (solo admin), el cliente ya puede PEDIR un owner distinto —
-- y precisamente por eso la validación tiene que vivir aquí, no en el
-- cliente: un no-admin no puede lograr que se le acepte un owner_id que no
-- sea el suyo ni manipulando la petición.
--
-- GUARDARRAÍL — dos formas de llamarla, según si hay sesión o no (mismo
-- patrón que reassign_contacts(), ver 0011_contact_assignments.sql):
--
-- Desde la app (con sesión): 3 parámetros. auth.uid() resuelve assigned_by.
--   select import_contacts(contactos_jsonb, owner_destino, motivo);
--
-- Desde el editor SQL (sin sesión): 4 parámetros, el último es quién firma.
--   select import_contacts(contactos_jsonb, owner_destino, motivo, 'uuid-del-admin');
--
-- El coalesce es coalesce(auth.uid(), p_assigned_by): si hay sesión, manda
-- la sesión SIEMPRE — igual que en reassign_contacts(), para que nadie
-- pueda firmar una importación a nombre de otra persona desde la app.
--
-- Cada contacto insertado deja un registro en contact_assignments con
-- from_owner null (es un contacto nuevo, no viene de nadie) y el motivo de
-- la importación — el historial de asignación de un contacto no puede
-- empezar en blanco solo porque llegó por CSV en vez de por
-- reassign_contacts().
-- ---------------------------------------------------------------

create function import_contacts(
  p_contacts jsonb,
  p_owner uuid default null,
  p_reason text default null,
  p_assigned_by uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned_by uuid := coalesce(auth.uid(), p_assigned_by);
  v_owner uuid := coalesce(p_owner, v_assigned_by);
  v_contact jsonb;
  v_new_id uuid;
  v_count int := 0;
begin
  if v_assigned_by is null then
    raise exception 'No hay sesión activa y no se pasó p_assigned_by: no se puede determinar quién firma esta importación.';
  end if;

  -- Mismo chequeo que reassign_contacts(): solo aplica si hay sesión real.
  -- Importar a nombre propio (v_owner = auth.uid()) nunca requiere admin —
  -- es exactamente el flujo actual de una vendedora, sin cambios.
  if auth.uid() is not null and v_owner <> auth.uid() and not is_admin() then
    raise exception 'Solo un admin puede importar contactos a nombre de otra persona.';
  end if;

  if not exists (select 1 from profiles where id = v_owner) then
    raise exception 'El destino (%) no existe.', v_owner;
  end if;

  if p_contacts is null or jsonb_array_length(p_contacts) = 0 then
    return 0;
  end if;

  for v_contact in select * from jsonb_array_elements(p_contacts)
  loop
    insert into contacts (owner_id, business_name, contact_name, phone, email, industry, tags, notes)
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
      v_contact->>'notes'
    )
    returning id into v_new_id;

    insert into contact_assignments (contact_id, from_owner, to_owner, assigned_by, reason)
    values (v_new_id, null, v_owner, v_assigned_by, coalesce(p_reason, 'Importación'));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
