-- ---------------------------------------------------------------
-- Permite que reassign_contacts() regrese contactos a reserva (destino
-- admin, in_reserve = true) — hasta hoy solo aceptaba un destino
-- role = 'seller' y fijaba in_reserve = false sin condición, así que no
-- había forma de "devolver a reserva" sin un UPDATE aparte que replicara
-- a mano el rastro de contact_assignments y el sync de
-- prospect_analysis/tasks/opportunities/appointments — exactamente lo que
-- esta función existe para no tener que hacer a mano.
--
-- Verificado antes de escribir esto (no asumido): los 4 sellers activos
-- (Valeria Coto, David Nava, Néstor Espinosa, Gladys Strevel) y el único
-- admin (Prisma, cf32e354-ce7b-47a3-8560-7e6f8cea4a9f) — Néstor Espinosa
-- es role='seller', NO admin, así que "mandar al admin" y "mandar a
-- Néstor" son destinos distintos que no se pueden confundir por error de
-- uuid. También se verificó que hoy, sin excepción, admin+in_reserve=true
-- (604) y seller+in_reserve=false (626) son las ÚNICAS dos combinaciones
-- que existen en toda la tabla — la restricción de abajo no rompe ningún
-- dato actual.
--
-- ---------- reassign_contacts(): destino admin o seller, nunca otro ----------
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
  v_to_owner_role text;
  v_in_reserve boolean;
begin
  if auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede reasignar contactos.';
  end if;

  if v_assigned_by is null then
    raise exception 'No hay sesión activa y no se pasó p_assigned_by: no se puede determinar quién firma esta reasignación.';
  end if;

  select role into v_to_owner_role from profiles where id = p_to_owner;

  if v_to_owner_role is null or v_to_owner_role not in ('seller', 'admin') then
    raise exception 'El destino (%) no existe o no tiene rol seller/admin.', p_to_owner;
  end if;

  -- Destino admin = vuelve a reserva. Destino vendedora = sale de reserva.
  -- Nunca a mano por caso: se deriva del rol del destino, siempre.
  v_in_reserve := (v_to_owner_role = 'admin');

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

    update contacts set owner_id = p_to_owner, in_reserve = v_in_reserve where id = v_contact_id;
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

-- ---------- restricción real, no solo lógica dentro de una función ----------
-- Un trigger, no un check constraint plano: la regla depende de
-- profiles.role (otra tabla), y un check constraint de Postgres no puede
-- referenciar otra tabla. El trigger cubre CUALQUIER escritura a
-- contacts.owner_id/in_reserve — no solo reassign_contacts() e
-- import_contacts(), que hoy ya cumplen la regla, sino cualquier script o
-- UPDATE futuro que la rompa por accidente. Dueño admin exige
-- in_reserve = true; dueño vendedora exige in_reserve = false; no hay
-- tercera combinación posible.
create function enforce_owner_reserve_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner_role text;
begin
  select role into v_owner_role from profiles where id = new.owner_id;

  if v_owner_role = 'admin' and new.in_reserve is distinct from true then
    raise exception 'Contacto % con dueño admin debe tener in_reserve = true.', new.id;
  elsif v_owner_role = 'seller' and new.in_reserve is distinct from false then
    raise exception 'Contacto % con dueña vendedora debe tener in_reserve = false.', new.id;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_owner_reserve_consistency
  before insert or update of owner_id, in_reserve on contacts
  for each row
  execute function enforce_owner_reserve_consistency();

-- ---------- verificación post-migración ----------
-- Confirma que la restricción entró sin romper ningún dato existente
-- (ya se había verificado antes de escribir esto, se repite aquí para que
-- la migración se falle sola si algo cambió entre la verificación y el
-- momento de aplicarla).
do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from contacts c
  join profiles p on p.id = c.owner_id
  where (p.role = 'admin' and c.in_reserve is distinct from true)
     or (p.role = 'seller' and c.in_reserve is distinct from false);

  if v_bad > 0 then
    raise exception 'Verificación post-migración falló: % contacto(s) violan la regla dueño/reserva.', v_bad;
  end if;
end $$;
