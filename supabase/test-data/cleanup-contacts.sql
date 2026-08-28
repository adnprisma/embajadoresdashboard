-- ---------------------------------------------------------------
-- Borra únicamente los 300 contactos de prueba (por el prefijo del
-- nombre + tu owner_id) — no toca ningún contacto real.
-- ---------------------------------------------------------------

delete from contacts
where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
  and business_name like 'Negocio de prueba %';
