-- ---------------------------------------------------------------
-- Borra únicamente lo que insertó seed-test-data.sql, bajo tu
-- owner_id. Sin CTEs: dos DELETE simples en orden.
--
-- IMPORTANTE: corre los dos DELETE de abajo POR SEPARADO (uno, luego
-- el otro) — el SQL Editor de Supabase solo ejecuta una sentencia a
-- la vez, aunque pegues varias juntas y reporte "éxito".
-- ---------------------------------------------------------------

delete from commissions
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
  and client_id in (
    select id from clients
    where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
      and name in ('Cliente Demo Norte', 'Cliente Demo Sur', 'Cliente Demo Centro')
  );

delete from clients
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
  and name in ('Cliente Demo Norte', 'Cliente Demo Sur', 'Cliente Demo Centro');
