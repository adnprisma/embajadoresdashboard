-- Borra únicamente las 15 oportunidades de prueba de seed-opportunities.sql
-- (por nombre exacto), no todo el pipeline. Un solo statement.
delete from opportunities
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
  and business_name in (
    'Negocio de prueba 1', 'Negocio de prueba 2', 'Negocio de prueba 3', 'Negocio de prueba 4',
    'Negocio de prueba 5', 'Negocio de prueba 6', 'Negocio de prueba 7', 'Negocio de prueba 8',
    'Taller Mecánico Beta', 'Consultoría Delta', 'Panadería Gamma', 'Estética Prisma',
    'Ferretería Omega', 'Restaurante Sigma', 'Clínica Theta'
  );
