-- 5 clientes de prueba con estados variados para /clientes. "Restaurante
-- Prueba Uno" vence en 3 días (ejercita "en riesgo": activo + next_renewal
-- dentro de 7 días); "Taller Prueba Cuatro" igual, para que la tarjeta no
-- dependa de un solo caso. Un solo statement — ver la nota en
-- seed-contacts.sql sobre el editor SQL de Supabase.
insert into clients (owner_id, name, plan, mrr, status, started_at, next_renewal) values
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Restaurante Prueba Uno',  'Pro',    5000, 'active',    current_date - 180, current_date + 3),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Boutique Prueba Dos',     'Basico', 3000, 'active',    current_date - 90,  current_date + 48),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Consultorio Prueba Tres', 'Pro',    8000, 'active',    current_date - 400, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Taller Prueba Cuatro',    'Basico', 2000, 'active',    current_date - 20,  current_date + 5),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', 'Café Prueba Cinco',       'Basico', 0,    'cancelled', current_date - 500, null);
