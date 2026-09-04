-- ---------------------------------------------------------------
-- Fase B del reparto de los 351 contactos en reserva (ver conversación:
-- Fase A = reporte, Fase B = etiquetas, Fase C = asignación).
--
-- Grupo 1 (200, teléfono válido): etiqueta "lote-sep-2026" además de la
-- de alcaldía que ya traían. Grupo 3 (151, ni teléfono ni correo) NO se
-- toca aquí — ya traía "visitar" aplicado de antes (verificado por grep:
-- ni import_contacts() ni el script del lote lo aplican — es una
-- escritura de origen desconocido, ver conversación).
--
-- El duplicado real (Veterinaria Animalitos, reserva, tel.
-- +52 55 5848 6980 — coincide por NOMBRE, no por teléfono, con el
-- contacto ya existente de Gladys Strevel, tel. +52 55 5674 7877) se
-- queda en el grupo 1 normal y se marca aparte con "posible-duplicado"
-- para que se note al asignar. No se borra ni se mezcla con el de Gladys.
-- ---------------------------------------------------------------

-- 1) Grupo 1 → "lote-sep-2026". Debe regresar 200.
select bulk_add_tag(
  (select array_agg(id) from contacts where in_reserve = true and phone is not null),
  'lote-sep-2026',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 2) El duplicado → "posible-duplicado". Debe regresar 1.
select bulk_add_tag(
  (select array_agg(id) from contacts
    where in_reserve = true
      and business_name = 'Veterinaria Animalitos'
      and phone = '+52 55 5848 6980'),
  'posible-duplicado',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 3) Verificación final — debe dar exactamente:
--    g1_con_lote=200, g1_sin_lote=0, g3_intacto=151, marcados_duplicado=1, total=351
select
  count(*) filter (where phone is not null and 'lote-sep-2026' = any(tags)) as g1_con_lote,
  count(*) filter (where phone is not null and not ('lote-sep-2026' = any(tags))) as g1_sin_lote,
  count(*) filter (where phone is null and 'visitar' = any(tags) and not ('lote-sep-2026' = any(tags))) as g3_intacto,
  count(*) filter (where 'posible-duplicado' = any(tags)) as marcados_duplicado,
  count(*) as total
from contacts where in_reserve = true;
