-- ---------------------------------------------------------------
-- Cambio de terminología (13 de septiembre de 2026): "vendedor", masculino
-- genérico, en toda la aplicación — decisión de negocio, no técnica.
--
-- Estas dos funciones tienen un mensaje de excepción que un usuario real
-- podría llegar a ver (si la app deja pasar un intento que el trigger
-- rechaza). Editar los archivos de las migraciones donde se crearon
-- (0025_daily_lead_target.sql, 0030_reassign_to_reserve.sql) NO cambia la
-- función que corre en producción — esos archivos son el registro de lo
-- que se aplicó entonces, y sus comentarios se quedan como están a
-- propósito (mismo criterio que las menciones ya archivadas de GitHub
-- Pages: el historial dice lo que se dijo en su momento, no se reescribe).
-- El único camino correcto para cambiar el mensaje de una función que ya
-- está en producción es una migración nueva con create or replace — este
-- archivo. Ninguna lógica cambia, solo el texto del mensaje.
--
-- No se tocan aquí: valores guardados en cualquier tabla, nombres de
-- columna, ni ningún check/enum — ninguno de los dos usaba "vendedora" ahí,
-- solo en el texto del mensaje.
create or replace function prevent_daily_lead_target_self_edit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.daily_lead_target is distinct from old.daily_lead_target
     and auth.uid() is not null and not is_admin() then
    raise exception 'Solo un admin puede cambiar la meta diaria de un vendedor.';
  end if;
  return new;
end;
$$;

create or replace function enforce_owner_reserve_consistency()
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
    raise exception 'Contacto % con dueño vendedor debe tener in_reserve = false.', new.id;
  end if;

  return new;
end;
$$;

-- ---------- verificación post-migración ----------
do $$
declare
  v_daily_target_src text;
  v_reserve_src text;
begin
  select prosrc into v_daily_target_src from pg_proc where proname = 'prevent_daily_lead_target_self_edit';
  if v_daily_target_src like '%vendedora%' then
    raise exception 'Verificación post-migración falló: prevent_daily_lead_target_self_edit() sigue diciendo "vendedora".';
  end if;
  if v_daily_target_src not like '%vendedor%' then
    raise exception 'Verificación post-migración falló: prevent_daily_lead_target_self_edit() perdió el mensaje esperado.';
  end if;

  select prosrc into v_reserve_src from pg_proc where proname = 'enforce_owner_reserve_consistency';
  if v_reserve_src like '%vendedora%' then
    raise exception 'Verificación post-migración falló: enforce_owner_reserve_consistency() sigue diciendo "vendedora".';
  end if;
  if v_reserve_src not like '%vendedor%' then
    raise exception 'Verificación post-migración falló: enforce_owner_reserve_consistency() perdió el mensaje esperado.';
  end if;
end $$;
