-- ---------------------------------------------------------------
-- Etiqueta "posible-duplicado" sobre los 4 contactos del lote-sep-2026
-- que resultaron ser duplicados internos (reserva vs. reserva), hallados
-- por el usuario DESPUÉS de que la Fase C ya los había asignado (ver
-- 25-fase-c-asignacion-lote-sep-2026.sql). No se fusionan ni se borran —
-- solo se marcan para que quien los contacte verifique si es el mismo
-- negocio o una sucursal distinta.
--
-- Bloqueado primero por diseño, no por error: bulk_add_tag() usa
-- v_owner := coalesce(auth.uid(), p_added_by) y solo actualiza filas
-- donde owner_id = v_owner (is_admin() da null/false sin sesión real,
-- que es el caso del editor SQL). Como Fase C ya reasignó estos 4 a
-- Valeria/Gladys, un primer intento con p_added_by = admin devolvió 0 —
-- comportamiento esperado, no una falla de la función. La corrección es
-- pasar como p_added_by el owner_id real de cada contacto, no el de admin.
--
-- Ubicados por business_name, sin filtrar por in_reserve (los 4 ya
-- tienen in_reserve = false por Fase C).
-- ---------------------------------------------------------------

-- 1) Par "Casa Luna" (Valeria Coto, 1ee0df7c-188d-426e-9f25-25352abf8c34).
--    Debe regresar 2.
select bulk_add_tag(
  (select array_agg(id) from contacts
    where business_name in (
      'Clínica Veterinaria Casa Luna Azcapotzalco',
      'Clínica Veterinaria Casa Luna Clavería'
    )),
  'posible-duplicado',
  '1ee0df7c-188d-426e-9f25-25352abf8c34'
);

-- 2) Par "Dr. Guerrero" (Gladys Strevel, 5ddc5080-240a-48ae-b0e6-71cbe1931c72).
--    Debe regresar 2.
select bulk_add_tag(
  (select array_agg(id) from contacts
    where business_name in (
      'Clínica Veterinaria Dr. Guerrero',
      'Hospital Veterinario Dr. Guerrero'
    )),
  'posible-duplicado',
  '5ddc5080-240a-48ae-b0e6-71cbe1931c72'
);

-- 3) Verificación — confirmado ya contra producción el 2026-09-04:
--    los 4 traen "posible-duplicado" además de su etiqueta de alcaldía
--    y "lote-sep-2026".
select business_name, array_to_string(tags, ',') as tags
from contacts
where business_name in (
  'Clínica Veterinaria Casa Luna Azcapotzalco',
  'Clínica Veterinaria Casa Luna Clavería',
  'Clínica Veterinaria Dr. Guerrero',
  'Hospital Veterinario Dr. Guerrero'
)
order by business_name;
