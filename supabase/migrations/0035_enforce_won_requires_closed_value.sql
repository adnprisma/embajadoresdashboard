-- ---------------------------------------------------------------
-- Cierra el agujero real del diálogo de crear oportunidad
-- (OpportunityDialog.tsx): el <select> de etapa no filtraba, así que
-- elegir "Cerrado" ahí hacía un INSERT directo (useCreateOpportunity, sin
-- pasar por update_opportunity_stage()) sin exigir closed_value — así
-- nacieron las dos duplicadas de Vital Titanium el 8 de septiembre de
-- 2026 (ver conversación / historial de opportunities). Dos capas, mismo
-- criterio que enforce_owner_reserve_consistency (0030_reassign_to_reserve.sql):
--
--   1. Filtrar el <select> en OpportunityDialog.tsx arregla el único
--      camino que ya conocemos.
--   2. Este trigger es el que de verdad cierra la puerta — cubre
--      cualquier camino, conocido o no: el diálogo, un script de
--      supabase/test-data/, una importación, o una pantalla que se
--      construya después. Un check constraint plano no alcanza porque la
--      regla depende de pipeline_stages.is_won (otra tabla).
--
-- ---------- TODAS LAS RUTAS QUE ESCRIBEN opportunities, revisadas antes
-- de escribir esto (no asumido) ----------
-- INSERT:
--   - useCreateOpportunity() (pipeline.ts) — el agujero real, arriba.
--   - supabase/test-data/seed-opportunities.sql — YA ESTÁ ROTO hoy, sin
--     relación con este trigger: inserta una columna `value` que no
--     existe desde 0016_opportunity_value_split.sql (renombrada a
--     value_legacy). No se toca aquí — es un script de seed de dev, no
--     se ha vuelto a correr desde antes de esa migración, y arreglarlo no
--     es parte de este cambio.
-- UPDATE de stage_id (los dos que importan):
--   - update_opportunity_stage() (0016) — LA RUTA BUENA. Fija stage_id Y
--     closed_value en el MISMO UPDATE (un solo `set`, no dos
--     statements), así que la fila que llega a este trigger ya está
--     completa cuando is_won es true — verificado leyendo el cuerpo de la
--     función antes de escribir este trigger, no dado por hecho. No debe
--     verse afectada.
--   - Cualquier UPDATE directo a stage_id (SQL Editor) — debe seguir
--     abierto como "corrección por SQL directo" (mismo patrón que 0016 y
--     0017 ya documentan), pero ahora exige que closed_value venga en el
--     MISMO statement si el destino es is_won. Es justo la regla que se
--     quiere.
-- UPDATE que NO toca stage_id ni closed_value (no pueden violar la regla,
-- revisados para confirmarlo, no para arreglar nada):
--   - useUpdateOpportunityNotes() — solo `notes`.
--   - useUpdateOpportunityEstimatedValue() — solo `estimated_value`.
--   - generate_quote() (0023/0024) — `estimated_value` y `mrr`.
--   - reassign_contacts() (0011/0018/0021/0030) — solo `owner_id`.
--   Ninguna de estas cuatro toca stage_id o closed_value, así que
--   NEW.stage_id/NEW.closed_value llegan igual que estaban en OLD — si la
--   fila ya era una ganada bien formada, sigue pasando; si hoy no existe
--   ninguna ganada mal formada (confirmado abajo, antes de crear el
--   trigger), ninguna de estas cuatro se ve afectada nunca.
-- DELETE: delete_opportunity() (0017) — este trigger es BEFORE INSERT OR
--   UPDATE, no toca DELETE.
-- ---------------------------------------------------------------

-- Confirma que no hay ninguna fila hoy que el trigger fuera a bloquear en
-- su próximo UPDATE (aunque ya se había confirmado antes, en vivo, al
-- investigar el caso de Vital Titanium — se repite aquí para que la
-- migración se falle sola si algo cambió desde entonces).
do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from opportunities o
  join pipeline_stages ps on ps.id = o.stage_id
  where ps.is_won and o.closed_value is null;

  if v_bad > 0 then
    raise exception 'Hay % oportunidad(es) ganada(s) con closed_value null HOY, antes de crear el trigger — corrígelas primero (SQL directo) o el próximo UPDATE que las toque, incluso uno sin relación, va a fallar.', v_bad;
  end if;
end $$;

create or replace function enforce_won_requires_closed_value()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_won boolean;
begin
  select is_won into v_is_won from pipeline_stages where id = new.stage_id;

  if v_is_won and new.closed_value is null then
    raise exception 'No se puede guardar una oportunidad en etapa ganada (%) sin closed_value. Usa update_opportunity_stage() — o, si es una corrección directa por SQL, incluye closed_value en el MISMO UPDATE.', new.stage_id;
  end if;

  return new;
end;
$$;

create trigger trg_enforce_won_requires_closed_value
  before insert or update on opportunities
  for each row
  execute function enforce_won_requires_closed_value();

-- ---------- verificación post-migración: las tres pruebas pedidas ----------
do $$
declare
  v_test_owner constant uuid := 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'; -- admin (Prisma), mismo owner que usan los seeds de prueba existentes
  v_test_id uuid;
  v_final_stage text;
  v_final_closed_value numeric;
begin
  -- Prueba 1: INSERT directo en "won" sin closed_value -> debe fallar.
  begin
    insert into opportunities (owner_id, contact_id, business_name, stage_id, mrr, position)
    values (v_test_owner, null, '_trigger_test_insert_won_sin_valor', 'won', 0, 0);

    raise exception 'FALLO DE PRUEBA 1: el trigger dejó insertar una oportunidad en "won" sin closed_value.';
  exception
    when others then
      if sqlerrm not like 'No se puede guardar una oportunidad en etapa ganada%' then
        raise; -- no era el rechazo esperado del trigger: no lo ocultes
      end if;
  end;

  -- Preparación para las pruebas 2 y 3: una oportunidad de prueba real,
  -- en una etapa abierta, creada limpio (sin tocar stage_id/closed_value
  -- todavía, así que el trigger no interviene aquí).
  insert into opportunities (owner_id, contact_id, business_name, stage_id, mrr, position)
  values (v_test_owner, null, '_trigger_test_mover_a_won', 'new', 0, 0)
  returning id into v_test_id;

  -- Prueba 2: UPDATE directo a "won" sin closed_value -> debe fallar.
  begin
    update opportunities set stage_id = 'won' where id = v_test_id;

    raise exception 'FALLO DE PRUEBA 2: el trigger dejó mover una oportunidad a "won" con un UPDATE directo sin closed_value.';
  exception
    when others then
      if sqlerrm not like 'No se puede guardar una oportunidad en etapa ganada%' then
        raise;
      end if;
  end;

  -- Confirma que la prueba 2 no dejó la fila a medias.
  if (select stage_id from opportunities where id = v_test_id) <> 'new' then
    raise exception 'FALLO DE PRUEBA 2: la oportunidad de prueba no quedó en "new" después del UPDATE rechazado.';
  end if;

  -- Prueba 3: ganar por la ruta real (update_opportunity_stage, la misma
  -- que usa el kanban) con su valor -> debe pasar. Esta es la que confirma
  -- que el trigger no rompió el flujo real.
  perform update_opportunity_stage(v_test_id, 'won', 27000, v_test_owner);

  select stage_id, closed_value into v_final_stage, v_final_closed_value
  from opportunities where id = v_test_id;

  if v_final_stage <> 'won' or v_final_closed_value <> 27000 then
    raise exception 'FALLO DE PRUEBA 3: update_opportunity_stage() no dejó la oportunidad en won con closed_value 27000 (quedó stage=%, closed_value=%).', v_final_stage, v_final_closed_value;
  end if;

  -- Limpieza: la prueba 1 nunca llegó a insertar nada (el INSERT falló y
  -- se deshizo solo); el único rastro real es esta fila de la prueba 2/3.
  delete from opportunities where id = v_test_id;
end $$;
