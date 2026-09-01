-- ---------------------------------------------------------------
-- Estado de contacto + su historial en interactions.
--
-- Lista cerrada, un valor a la vez, CHECK a nivel de base (no solo en la
-- UI): sin_contactar (default) · contactado · respondio · interesado ·
-- no_interesado · ilocalizable.
--
-- El historial NO vive en una tabla nueva: se guarda en `interactions`
-- (kind = 'status_change'), con dos columnas nuevas — from_status/to_status
-- — en vez de texto libre en `body`. Dos razones:
--   1) La pestaña Línea de tiempo ya lee de interactions ordenado por
--      occurred_at — reaparecer ahí es gratis, sin fusionar dos fuentes.
--   2) to_status en su propia columna es lo que permite contar "cuántos
--      pasaron a contactado esta semana" con un WHERE directo e indexable
--      (ver el índice abajo), en vez de parsear texto de `body` con regex
--      cada vez que haga falta la métrica.
-- La oración legible ("Cambió de Sin contactar a Contactado") se arma en
-- el cliente a partir de from_status/to_status + copy.ts, nunca se guarda
-- como texto — si cambia la redacción de un estado, las entradas viejas
-- se leen con el texto actual, no con uno congelado.
--
-- `kind` en interactions no tenía CHECK (era texto libre desde 0001), así
-- que agregar 'status_change' como valor no rompe nada existente.
-- ---------------------------------------------------------------

alter table contacts
  add column status text not null default 'sin_contactar'
  check (status in ('sin_contactar', 'contactado', 'respondio', 'interesado', 'no_interesado', 'ilocalizable'));

alter table interactions
  add column from_status text
    check (from_status is null or from_status in ('sin_contactar', 'contactado', 'respondio', 'interesado', 'no_interesado', 'ilocalizable')),
  add column to_status text
    check (to_status is null or to_status in ('sin_contactar', 'contactado', 'respondio', 'interesado', 'no_interesado', 'ilocalizable'));

-- Para el conteo semanal del bloque 3 ("cuántos pasaron a X esta semana").
create index on interactions (kind, to_status, occurred_at);

-- ---------------------------------------------------------------
-- change_contact_status: cambia el estado y escribe su registro en
-- interactions EN LA MISMA función — si se pudieran separar, algún día
-- habría un contacto con estado cambiado y sin rastro de cuándo, y de esos
-- registros depende la métrica semanal del bloque 3.
--
-- GUARDARRAÍL — igual que generate_weekly_plan(): SIN parámetro de dueño
-- cruzado, sin excepción de admin. Un admin ve todo por RLS
-- (0010_rls_admin.sql), pero eso no significa que pueda VALIDAR como
-- dueño — quien no hizo la llamada no debería poder decir que la hizo.
-- Consecuencia explícita y aceptada: un admin sin contactos propios no
-- puede corregir NINGÚN estado, ni uno marcado por error. La corrección de
-- un estado equivocado pasa por la vendedora dueña del contacto, o por SQL
-- directo — nunca por un bypass de admin en este RPC.
--
-- Desde la app (con sesión): 2 parámetros. auth.uid() resuelve v_owner.
--   select change_contact_status(contact_id, 'contactado');
-- Desde el editor SQL (sin sesión): 3 parámetros, el tercero es quién firma.
--   select change_contact_status(contact_id, 'contactado', 'uuid-de-la-vendedora');
--
-- Devuelve boolean: true si de verdad cambió algo, false si el estado
-- nuevo es igual al actual (no-op, no escribe en interactions) — para que
-- el cliente nunca muestre un "guardado" cuando no se guardó nada.
-- ---------------------------------------------------------------

create function change_contact_status(
  p_contact_id uuid,
  p_new_status text,
  p_changed_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := coalesce(auth.uid(), p_changed_by);
  v_from_status text;
begin
  if v_owner is null then
    raise exception 'No hay sesión activa y no se pasó p_changed_by: no se puede determinar quién firma este cambio.';
  end if;

  select status into v_from_status
  from contacts
  where id = p_contact_id and owner_id = v_owner;

  if not found then
    raise exception 'El contacto % no pertenece a este usuario.', p_contact_id;
  end if;

  if v_from_status = p_new_status then
    return false;
  end if;

  update contacts set status = p_new_status where id = p_contact_id;

  insert into interactions (owner_id, contact_id, kind, from_status, to_status, occurred_at)
  values (v_owner, p_contact_id, 'status_change', v_from_status, p_new_status, now());

  return true;
end;
$$;
