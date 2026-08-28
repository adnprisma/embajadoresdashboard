-- ---------------------------------------------------------------
-- Datos de prueba para /dashboard — NO es una migración.
-- owner_id fijo (tu UUID real, ya confirmado): cf32e354-ce7b-47a3-8560-7e6f8cea4a9f
-- Sin CTEs, sin interval, sin cross join: solo INSERT planos con
-- fechas literales, para que sea imposible de romper al copiar.
--
-- IMPORTANTE: corre cada uno de los dos INSERT de abajo POR SEPARADO
-- (selecciona y ejecuta uno, luego el otro). El SQL Editor de Supabase
-- solo corre una sentencia a la vez — pegar y correr ambas juntas de un
-- jalón hizo que reportara "éxito" sin insertar nada.
-- ---------------------------------------------------------------

-- ---------- 3 clientes ----------
insert into clients (owner_id, name, plan, mrr, status, started_at, next_renewal) values
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Cliente Demo Norte', 'standard', 3500, 'active', '2026-04-27', '2026-09-04'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Cliente Demo Sur', 'advanced', 6200, 'active', '2026-01-27', '2026-09-17'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Cliente Demo Centro', 'standard', 2100, 'active', '2026-06-27', null);

-- ---------- 14 comisiones en 6 meses, montos variados ----------
insert into commissions (owner_id, client_id, concept, amount, status, is_estimate, period, paid_at) values
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Centro'), 'Comisión mensual', 1800, 'validating', true, '2026-08-01', null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 2600, 'trial', true, '2026-08-01', null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Sur'), 'Comisión mensual', 3400, 'payable', false, '2026-08-01', null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 4200, 'paid', false, '2026-08-01', '2026-08-25'),

  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Sur'), 'Comisión mensual', 3900, 'paid', false, '2026-07-01', '2026-07-06'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Centro'), 'Comisión mensual', 2700, 'payable', false, '2026-07-01', null),

  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Sur'), 'Comisión mensual', 5300, 'paid', false, '2026-06-01', '2026-06-05'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Centro'), 'Comisión mensual', 2100, 'paid', false, '2026-06-01', '2026-06-07'),

  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 3100, 'paid', false, '2026-05-01', '2026-05-06'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 3400, 'payable', false, '2026-05-01', null),

  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 3200, 'paid', false, '2026-04-01', '2026-04-06'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Centro'), 'Bono por renovación', 900, 'paid', false, '2026-04-01', '2026-04-08'),

  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Norte'), 'Comisión mensual', 3200, 'paid', false, '2026-03-01', '2026-03-06'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from clients where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' and name = 'Cliente Demo Sur'), 'Comisión mensual', 5100, 'paid', false, '2026-03-01', '2026-03-07');
