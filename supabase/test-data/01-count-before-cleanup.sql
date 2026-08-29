-- ---------------------------------------------------------------
-- Paso 1a — SOLO LECTURA. Cuenta lo que hay hoy bajo tu owner_id en las
-- 7 tablas que se van a limpiar, antes de borrar nada. Corre esto primero
-- y revisa los números; el borrado real vive en un archivo aparte
-- (02-delete-test-data.sql) para no ejecutarlo por accidente.
-- ---------------------------------------------------------------

select
  (select count(*) from contacts     where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as contacts,
  (select count(*) from opportunities where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as opportunities,
  (select count(*) from clients      where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as clients,
  (select count(*) from commissions  where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as commissions,
  (select count(*) from appointments where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as appointments,
  (select count(*) from tasks        where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as tasks,
  (select count(*) from interactions where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f') as interactions;
