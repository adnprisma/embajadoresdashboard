-- ---------------------------------------------------------------
-- Corrige el lote de 88 leads de Gladys recién importado
-- (prospeccion_veterinarias_DOS - leads.csv, Miguel Hidalgo + Iztapalapa).
--
-- El CSV traía dos problemas de origen (detectados al comparar el campo
-- "negocio" contra los HTML de análisis, por nombre exacto — nunca por
-- parecido):
--
-- 1) 27 negocios reales quedaron importados con "ALTA"/"MEDIA"/"BAJA"
--    pegado al final del nombre (ej. "Bonvet Clínica Veterinaria ALTA").
--    Sin corregir esto, el parser de prospect_analysis nunca los va a
--    emparejar contra el HTML — el match es por nombre exacto a propósito,
--    así que estos 27 se habrían quedado sin análisis en silencio.
-- 2) 5 filas son basura del CSV origen, no negocios reales: "Lunes",
--    "Martes", "Miércoles", "Jueves", "Viernes" — probablemente una celda
--    combinada de un calendario que se coló al exportar.
--
-- Corre primero el SELECT de verificación (cuenta 27 + 5 = 32 antes de
-- tocar nada). Si el conteo no cuadra, para y avisa antes de seguir.
-- ---------------------------------------------------------------

-- 1) Verificación
select
  (select count(*) from contacts c
     join profiles p on p.id = c.owner_id
    where p.full_name = 'Gladys Strevel'
      and c.business_name in (
        'Bonvet Clínica Veterinaria ALTA',
        'Meraki Hospital Veterinario ALTA',
        'Hospital Veterinario Darwin ALTA',
        'Hospican Escandón ALTA',
        'Dog City Pet Hospital 24 Horas — Pensil ALTA',
        'Hospital Veterinario Moon Care ALTA',
        'FarmAnimals Polanco ALTA',
        'Veterinaria Marina ALTA',
        'OmniMalia — Veterinaria de Exóticos ALTA',
        'Pet Path — Hospital Veterinario MEDIA',
        'Centro Veterinario Granada MEDIA',
        'Farmacia Veterinaria Tacuba MEDIA',
        'Animalitos Hospital Veterinario 24 Horas — Polanco BAJA',
        'Vet Salud — Centro Veterinario BAJA',
        'Animalitos México — Lomas de Chapultepec BAJA',
        'Hospital Veterinario WestCare — Torre Polanco BAJA',
        'SimiPet Care — Escandón BAJA',
        'Vetalia — Polanco BAJA',
        'Servicios Veterinarios Escuadrón Animal ALTA',
        'Clivet Iztapalapa — Hospital Veterinario 24 Horas ALTA',
        'Clínica Veterinaria Handy ALTA',
        'Hospital Veterinario Carson ALTA',
        'Veterinaria Animalitos ALTA',
        'Hospital de Especialidades Veterinarias C.H.V. MEDIA',
        'Centro de Bienestar Animal de Oriente MEDIA',
        'Petco — Canal de Garay BAJA',
        'SimiPet Care — Iztapalapa BAJA'
      )) as negocios_a_renombrar_esperado_27,
  (select count(*) from contacts c
     join profiles p on p.id = c.owner_id
    where p.full_name = 'Gladys Strevel'
      and c.business_name in ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes')
  ) as basura_a_borrar_esperado_5;

-- 2) Renombra los 27 (quita el sufijo de prioridad que se coló en el nombre)
update contacts c
set business_name = v.clean
from (values
  ('Bonvet Clínica Veterinaria ALTA', 'Bonvet Clínica Veterinaria'),
  ('Meraki Hospital Veterinario ALTA', 'Meraki Hospital Veterinario'),
  ('Hospital Veterinario Darwin ALTA', 'Hospital Veterinario Darwin'),
  ('Hospican Escandón ALTA', 'Hospican Escandón'),
  ('Dog City Pet Hospital 24 Horas — Pensil ALTA', 'Dog City Pet Hospital 24 Horas — Pensil'),
  ('Hospital Veterinario Moon Care ALTA', 'Hospital Veterinario Moon Care'),
  ('FarmAnimals Polanco ALTA', 'FarmAnimals Polanco'),
  ('Veterinaria Marina ALTA', 'Veterinaria Marina'),
  ('OmniMalia — Veterinaria de Exóticos ALTA', 'OmniMalia — Veterinaria de Exóticos'),
  ('Pet Path — Hospital Veterinario MEDIA', 'Pet Path — Hospital Veterinario'),
  ('Centro Veterinario Granada MEDIA', 'Centro Veterinario Granada'),
  ('Farmacia Veterinaria Tacuba MEDIA', 'Farmacia Veterinaria Tacuba'),
  ('Animalitos Hospital Veterinario 24 Horas — Polanco BAJA', 'Animalitos Hospital Veterinario 24 Horas — Polanco'),
  ('Vet Salud — Centro Veterinario BAJA', 'Vet Salud — Centro Veterinario'),
  ('Animalitos México — Lomas de Chapultepec BAJA', 'Animalitos México — Lomas de Chapultepec'),
  ('Hospital Veterinario WestCare — Torre Polanco BAJA', 'Hospital Veterinario WestCare — Torre Polanco'),
  ('SimiPet Care — Escandón BAJA', 'SimiPet Care — Escandón'),
  ('Vetalia — Polanco BAJA', 'Vetalia — Polanco'),
  ('Servicios Veterinarios Escuadrón Animal ALTA', 'Servicios Veterinarios Escuadrón Animal'),
  ('Clivet Iztapalapa — Hospital Veterinario 24 Horas ALTA', 'Clivet Iztapalapa — Hospital Veterinario 24 Horas'),
  ('Clínica Veterinaria Handy ALTA', 'Clínica Veterinaria Handy'),
  ('Hospital Veterinario Carson ALTA', 'Hospital Veterinario Carson'),
  ('Veterinaria Animalitos ALTA', 'Veterinaria Animalitos'),
  ('Hospital de Especialidades Veterinarias C.H.V. MEDIA', 'Hospital de Especialidades Veterinarias C.H.V.'),
  ('Centro de Bienestar Animal de Oriente MEDIA', 'Centro de Bienestar Animal de Oriente'),
  ('Petco — Canal de Garay BAJA', 'Petco — Canal de Garay'),
  ('SimiPet Care — Iztapalapa BAJA', 'SimiPet Care — Iztapalapa')
) as v(dirty, clean)
where c.business_name = v.dirty
  and c.owner_id = (select id from profiles where full_name = 'Gladys Strevel');

-- 3) Borra las 5 filas basura (nunca fueron negocios reales)
delete from contacts
where owner_id = (select id from profiles where full_name = 'Gladys Strevel')
  and business_name in ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes');

-- 4) Verificación final: deberían quedar 83 contactos de Gladys
select count(*) as total_contactos_gladys
from contacts c
join profiles p on p.id = c.owner_id
where p.full_name = 'Gladys Strevel';
