-- ---------------------------------------------------------------
-- Arregla de raíz el overload duplicado de import_contacts(), encontrado
-- al cargar el lote de dentistas del 7 de septiembre de 2026 (ver
-- 32-importa-dentistas-cdmx-7sep.sql y la nota en CLAUDE.md).
--
-- ---------- qué pasó ----------
-- 0013_import_contacts.sql creó import_contacts() con 4 parámetros
-- (p_contacts, p_owner, p_reason, p_assigned_by). 0021_contact_reserve_
-- and_tags.sql quiso agregarle p_in_reserve con "create or replace
-- function import_contacts(... 5 parámetros ...)" — pero create or
-- replace SOLO reemplaza una función existente si su firma (cantidad y
-- tipo de parámetros) es idéntica. Al tener un parámetro más, Postgres no
-- reemplazó nada: creó una SEGUNDA función. Desde entonces conviven dos
-- funciones import_contacts en la base, y cualquier llamada con hasta 4
-- argumentos (todos los parámetros de ambas tienen default) es ambigua —
-- "ERROR 42725: function import_contacts(...) is not unique".
--
-- ---------- qué NO se rompió ----------
-- La única diferencia real de comportamiento entre las dos versiones es
-- p_in_reserve: la de 5 parámetros decide in_reserve explícito
-- (coalesce(p_in_reserve, owner_es_admin)); la de 4 no lo toca (porque esa
-- columna no existía cuando se escribió esa función). Los 350 contactos
-- del lote de veterinarias (23-importa-veterinarias-cdmx-2sep.sql, 4
-- argumentos posicionales) tuvieron que entrar por la versión de 4 —
-- 0021 es la MISMA migración que agregó la columna in_reserve y la
-- función de 5 parámetros, así que la de 5 no podía existir todavía
-- cuando ese import corrió. Pero esa misma migración 0021 backfillea
-- in_reserve = true para "todos los contactos con owner_id = admin" en un
-- UPDATE incondicional, sin importar cómo se insertaron — ese backfill sí
-- cubrió a los 350 recién importados. Verificado en vivo antes de esta
-- migración: de los contactos con tag 'lote-sep-2026' e industry
-- 'Veterinaria', 0 quedan hoy con owner_id = admin (los 201 que aún
-- tienen esa combinación de tag+giro ya fueron reasignados a una
-- vendedora, lo que además vuelve a fijar in_reserve = false vía
-- reassign_contacts() sin relación con este bug). No hay fila viva hoy
-- con in_reserve mal puesto por este overload — por eso este arreglo es
-- solo el drop, sin backfill de datos.
--
-- ---------- barrido de quién llama con 4 argumentos, antes del drop ----------
-- Cliente (src/lib/queries/contacts.ts, useImportContacts): llama por RPC
-- con parámetros NOMBRADOS e incluye p_in_reserve siempre (aunque sea
-- null) — PostgREST resuelve por nombre de parámetro, no por posición, así
-- que esta llamada YA resolvía sin ambigüedad a la versión de 5 desde
-- siempre. No se ve afectada por el drop.
-- scripts/: sin referencias a import_contacts.
-- supabase/test-data/: 23-importa-veterinarias-cdmx-2sep.sql es el único
-- archivo con exactamente 4 argumentos posicionales — ya se ejecutó, es un
-- script histórico, no se vuelve a correr. 30-crea-contacto-veterinaria-
-- molinos.sql y 32-importa-dentistas-cdmx-7sep.sql ya usan 5 argumentos
-- explícitos. Ningún llamador activo depende de la versión de 4.
-- ---------------------------------------------------------------

drop function import_contacts(jsonb, uuid, text, uuid);

-- Verificación — debe quedar exactamente 1 función import_contacts, con
-- 5 parámetros (el último, p_in_reserve).
do $$
declare
  v_count int;
  v_args text;
begin
  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'import_contacts' and n.nspname = 'public';

  if v_count != 1 then
    raise exception 'Verificación post-drop falló: se esperaba exactamente 1 función import_contacts, hay %.', v_count;
  end if;

  select pg_get_function_identity_arguments(p.oid) into v_args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'import_contacts' and n.nspname = 'public';

  if v_args !~ 'p_in_reserve' then
    raise exception 'Verificación post-drop falló: la función que quedó no tiene p_in_reserve (args: %) — se borró la versión equivocada.', v_args;
  end if;
end $$;
