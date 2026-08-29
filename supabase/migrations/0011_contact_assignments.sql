-- ---------------------------------------------------------------
-- Bitácora de reasignación de contactos: quién tenía qué, a quién se le
-- dio, quién lo autorizó y por qué. Se llena únicamente desde
-- reassign_contacts() — sin políticas de escritura aquí a propósito.
-- ---------------------------------------------------------------

create table contact_assignments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  from_owner uuid references profiles(id),
  to_owner uuid not null references profiles(id),
  assigned_by uuid not null references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

alter table contact_assignments enable row level security;

-- Admin ve todo. Una vendedora ve el historial de los contactos que le
-- quitaron o le dieron — no el de sus compañeras (from_owner/to_owner que
-- no sea ella misma queda fuera).
create policy "contact_assignments_select"
  on contact_assignments for select
  to authenticated
  using (is_admin() or from_owner = auth.uid() or to_owner = auth.uid());

-- ---------------------------------------------------------------
-- reassign_contacts: mueve uno o más contactos (y todo lo que cuelga de
-- cada uno) a otra vendedora, y deja el rastro en contact_assignments.
-- Solo un admin puede llamarla. Todo el trabajo vive dentro de esta
-- función: si algo falla a medio camino, plpgsql revierte la función
-- completa — no hay forma de que se mueva la mitad de un lote.
--
-- No mueve clients ni commissions — decisión explícita, no descuido: una
-- comisión pertenece a quien cerró la venta, no a quien recibe el
-- prospecto después. Si un contacto ya se convirtió en cliente, ese
-- cliente y su comisión se quedan con la vendedora original aunque el
-- contacto (y su historial de prospección futura) se reasigne.
-- ---------------------------------------------------------------

create function reassign_contacts(
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
  -- La sesión real manda siempre que exista: si hay auth.uid(), es
  -- infalsificable desde la app (nadie puede pasar p_assigned_by y firmar
  -- a nombre de otra persona). p_assigned_by solo se usa cuando no hay
  -- ninguna sesión — el caso del SQL Editor.
  v_assigned_by uuid := coalesce(auth.uid(), p_assigned_by);
  v_moved_count int := 0;
begin
  -- El chequeo de admin solo aplica si hay sesión: sin sesión (SQL
  -- Editor, service role) ya es un contexto de confianza total, igual que
  -- el trigger de profiles en 0010.
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
    update interactions set owner_id = p_to_owner where contact_id = v_contact_id;
    update opportunities set owner_id = p_to_owner where contact_id = v_contact_id;
    update appointments set owner_id = p_to_owner where contact_id = v_contact_id;

    insert into contact_assignments (contact_id, from_owner, to_owner, assigned_by, reason)
    values (v_contact_id, v_from_owner, p_to_owner, v_assigned_by, p_reason);

    v_moved_count := v_moved_count + 1;
  end loop;

  return v_moved_count;
end;
$$;
