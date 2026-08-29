-- ---------------------------------------------------------------
-- Paso 1b — BORRA. Corre esto solo después de revisar los conteos de
-- 01-count-before-cleanup.sql. Borra TODOS los datos de prueba de tu
-- owner_id en las 7 tablas pedidas: contacts, opportunities, clients,
-- commissions, appointments, tasks, interactions.
--
-- NO toca: profiles, pipeline_stages, ranks, resources, app_config,
-- points_ledger, notifications.
--
-- Orden: hijos antes que padres (comisiones → interacciones → tareas →
-- citas → oportunidades → clientes → contactos). Ningún FK del esquema es
-- "restrict" (todos son cascade o set null, ver 0001_schema.sql), así que
-- el orden no evita errores — es solo para que la lógica quede clara sin
-- depender de qué cascada automática ya adelantó el trabajo.
--
-- Un solo statement (DO block) — compatible con que el SQL Editor de esta
-- cuenta corre una sentencia por pegado. Los conteos de control (deben
-- coincidir con lo que viste en el paso 1a) salen en el panel de
-- Notices/salida de la corrida, no como filas de resultado.
-- ---------------------------------------------------------------

do $$
declare
  v_owner uuid := 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f';
  v_count int;
begin
  select count(*) into v_count from commissions where owner_id = v_owner;
  raise notice 'Borrando % filas de commissions', v_count;
  delete from commissions where owner_id = v_owner;

  select count(*) into v_count from interactions where owner_id = v_owner;
  raise notice 'Borrando % filas de interactions', v_count;
  delete from interactions where owner_id = v_owner;

  select count(*) into v_count from tasks where owner_id = v_owner;
  raise notice 'Borrando % filas de tasks', v_count;
  delete from tasks where owner_id = v_owner;

  select count(*) into v_count from appointments where owner_id = v_owner;
  raise notice 'Borrando % filas de appointments', v_count;
  delete from appointments where owner_id = v_owner;

  select count(*) into v_count from opportunities where owner_id = v_owner;
  raise notice 'Borrando % filas de opportunities', v_count;
  delete from opportunities where owner_id = v_owner;

  select count(*) into v_count from clients where owner_id = v_owner;
  raise notice 'Borrando % filas de clients', v_count;
  delete from clients where owner_id = v_owner;

  select count(*) into v_count from contacts where owner_id = v_owner;
  raise notice 'Borrando % filas de contacts', v_count;
  delete from contacts where owner_id = v_owner;

  raise notice 'Listo. Todas las tablas anteriores en 0 filas para este owner_id.';
end $$;
