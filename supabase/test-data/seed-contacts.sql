-- ---------------------------------------------------------------
-- 300 contactos de prueba para ejercitar la virtualización de
-- /contactos. NO es una migración. Una sola sentencia (INSERT ...
-- SELECT ... generate_series), sin CTEs ni bloque DO — el editor de
-- Supabase solo corre una sentencia a la vez de forma confiable.
-- owner_id fijo (tu UUID real, ya confirmado en bloques anteriores):
-- cf32e354-ce7b-47a3-8560-7e6f8cea4a9f
-- ---------------------------------------------------------------

insert into contacts (owner_id, business_name, contact_name, phone, email, industry, tags, notes)
select
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f',
  'Negocio de prueba ' || n,
  case when n % 5 = 0 then null else 'Contacto ' || n end,
  '55' || lpad((1000000 + n)::text, 7, '0'),
  'contacto' || n || '@ejemplo.com',
  (array['Restaurantes', 'Retail', 'Salud', 'Educación', 'Tecnología', 'Construcción', 'Belleza', 'Automotriz', 'Turismo', 'Servicios profesionales'])[1 + (n % 10)],
  case
    when n % 3 = 0 then array['VIP', 'Frecuente']
    when n % 3 = 1 then array['Nuevo']
    else array['Frecuente']
  end,
  case when n % 4 = 0 then 'Contacto de prueba generado para probar la tabla.' else null end
from generate_series(1, 300) as n;
