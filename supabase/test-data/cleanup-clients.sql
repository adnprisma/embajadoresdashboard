-- Borra únicamente los 5 clientes de prueba de seed-clients.sql (por
-- nombre exacto). Un solo statement.
delete from clients
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
  and name in (
    'Restaurante Prueba Uno', 'Boutique Prueba Dos', 'Consultorio Prueba Tres',
    'Taller Prueba Cuatro', 'Café Prueba Cinco'
  );
