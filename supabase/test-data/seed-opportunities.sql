-- 15 oportunidades de prueba repartidas entre las 9 etapas del pipeline,
-- para probar el Kanban (drag & drop, "Mover a…", columna vacía vs con
-- tarjetas). Un solo statement — ver la nota en seed-contacts.sql sobre el
-- editor SQL de Supabase. Algunas quedan ligadas a contactos ya sembrados
-- por seed-contacts.sql (via subquery); otras a propósito sin contact_id,
-- para probar la tarjeta sin enlace a /contactos/[id].
insert into opportunities (owner_id, contact_id, business_name, stage_id, value, mrr, position, closed_at, notes) values
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 1' limit 1), 'Negocio de prueba 1', 'new', 15000, 0, 1, null, 'Oportunidad de prueba'),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Taller Mecánico Beta', 'new', 8000, 500, 2, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 2' limit 1), 'Negocio de prueba 2', 'analysis', 22000, 0, 1, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Consultoría Delta', 'analysis', 12000, 1200, 2, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 3' limit 1), 'Negocio de prueba 3', 'scheduled', 18000, 0, 1, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Panadería Gamma', 'scheduled', 9500, 0, 2, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 4' limit 1), 'Negocio de prueba 4', 'show', 30000, 2000, 1, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Estética Prisma', 'show', 14000, 0, 2, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 5' limit 1), 'Negocio de prueba 5', 'no_show', 11000, 0, 1, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Ferretería Omega', 'won', 40000, 3500, 1, now(), null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 6' limit 1), 'Negocio de prueba 6', 'won', 25000, 0, 2, now(), null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Restaurante Sigma', 'churn', 9000, 0, 1, now(), null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 7' limit 1), 'Negocio de prueba 7', 'nurturing', 17000, 0, 1, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', null, 'Clínica Theta', 'nurturing', 20000, 1800, 2, null, null),
  ('cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', (select id from contacts where business_name = 'Negocio de prueba 8' limit 1), 'Negocio de prueba 8', 'discarded', 6000, 0, 1, now(), null);
