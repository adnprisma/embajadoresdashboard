-- ---------------------------------------------------------------
-- generate_weekly_plan: crea hasta 50 tareas de una sola llamada, para el
-- plan de acción semanal de /tareas → (fullscreen)/plan-semanal.
--
-- A diferencia de import_contacts()/reassign_contacts(), aquí NO hay
-- parámetro de "a nombre de quién": cada vendedora genera su plan sobre SUS
-- propios leads, sin excepción de admin. Por eso no existe un p_owner que
-- validar contra is_admin() — el dueño de cada tarea es siempre v_owner
-- (quien llama, o p_created_by desde el editor SQL), y cada contacto del
-- lote se valida contra ESE mismo v_owner. No hay bypass posible.
--
-- GUARDARRAÍL — mismo patrón que reassign_contacts()/import_contacts():
-- Desde la app (con sesión): 1 parámetro. auth.uid() resuelve v_owner.
--   select generate_weekly_plan(items_jsonb);
-- Desde el editor SQL (sin sesión): 2 parámetros, el segundo es quién firma.
--   select generate_weekly_plan(items_jsonb, 'uuid-de-la-vendedora');
-- coalesce(auth.uid(), p_created_by): si hay sesión, manda la sesión
-- SIEMPRE.
--
-- IDEMPOTENCIA — la ventana de "ya tiene tarea esta semana" sale del
-- due_at de CADA ítem, nunca de now(): si se genera en sábado, las fechas
-- caen en la semana siguiente, y now() (semana en curso) sería la ventana
-- equivocada — generar sábado y de nuevo el lunes duplicaría todo. Y la
-- comparación se hace en America/Mexico_City, no en la zona horaria de la
-- sesión de Postgres (normalmente UTC): un domingo 7pm CDMX ya es lunes en
-- UTC, así que anclar a las columnas timestamptz sin convertir daría la
-- semana equivocada justo en el caso límite que más importa.
--
-- Salta la fila (no aborta el lote) si el contacto ya tiene una tarea con
-- due_at en esa misma semana — cuenta cuántas insertó de verdad y cuántas
-- saltó, para que la pantalla pueda decir la verdad en vez del número que
-- se pidió crear.
-- ---------------------------------------------------------------

create function generate_weekly_plan(
  p_items jsonb,
  p_created_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := coalesce(auth.uid(), p_created_by);
  v_item jsonb;
  v_contact_id uuid;
  v_title text;
  v_due_at timestamptz;
  v_week_start timestamp;
  v_created int := 0;
  v_skipped int := 0;
begin
  if v_owner is null then
    raise exception 'No hay sesión activa y no se pasó p_created_by: no se puede determinar de quién es este plan.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('created', 0, 'skipped', 0);
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_contact_id := (v_item->>'contact_id')::uuid;
    v_title := v_item->>'title';
    v_due_at := (v_item->>'due_at')::timestamptz;

    if not exists (select 1 from contacts where id = v_contact_id and owner_id = v_owner) then
      raise exception 'El contacto % no pertenece a este usuario.', v_contact_id;
    end if;

    v_week_start := date_trunc('week', v_due_at at time zone 'America/Mexico_City');

    if exists (
      select 1 from tasks t
      where t.contact_id = v_contact_id
        and t.due_at is not null
        and date_trunc('week', t.due_at at time zone 'America/Mexico_City') = v_week_start
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into tasks (owner_id, contact_id, title, due_at)
    values (v_owner, v_contact_id, v_title, v_due_at);

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('created', v_created, 'skipped', v_skipped);
end;
$$;
