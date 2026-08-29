-- ---------------------------------------------------------------
-- Plantilla de reasignación — edita los valores marcados con «...» y
-- descomenta el bloque que necesites. Los tres corren desde el SQL
-- Editor (sin sesión), así que llevan el 4º parámetro p_assigned_by con
-- tu UUID de admin — sin él falla con "No hay sesión activa y no se pasó
-- p_assigned_by" (ver el comentario sobre reassign_contacts() en
-- 0011_contact_assignments.sql).
--
-- UUIDs de referencia (de 03-assign-roles.sql):
--   Nestor Espinosa (admin)  cf32e354-ce7b-47a3-8560-7e6f8cea4a9f
--   Gladys Strevel (seller)  5ddc5080-240a-48ae-b0e6-71cbe1931c72
--   Valeria Coto (seller)    1ee0df7c-188d-426e-9f25-25352abf8c34
-- ---------------------------------------------------------------

-- ============================================================
-- 1) Mover TODOS los contactos de una persona a otra
-- ============================================================
-- select reassign_contacts(
--   p_contact_ids   => (
--     select array_agg(id) from contacts where owner_id = '«uuid-origen»'
--   ),
--   p_to_owner      => '«uuid-destino»',
--   p_reason        => '«motivo»',
--   p_assigned_by   => 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' -- Nestor (admin)
-- ) as contactos_movidos;

-- ============================================================
-- 2) Mover solo los contactos con una etiqueta (ej. una alcaldía)
-- ============================================================
-- Etiquetas de prospección ya en uso: prospecto|alvaroobregon,
-- prospecto|benitojuarez, prospecto|coyoacan, prospecto|cuauhtemoc.
-- select reassign_contacts(
--   p_contact_ids   => (
--     select array_agg(id) from contacts where tags @> array['«etiqueta»']
--   ),
--   p_to_owner      => '«uuid-destino»',
--   p_reason        => '«motivo»',
--   p_assigned_by   => 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' -- Nestor (admin)
-- ) as contactos_movidos;

-- ============================================================
-- 3) Mover una lista específica de ids
-- ============================================================
-- select reassign_contacts(
--   p_contact_ids   => array['«uuid-contacto-1»', '«uuid-contacto-2»']::uuid[],
--   p_to_owner      => '«uuid-destino»',
--   p_reason        => '«motivo»',
--   p_assigned_by   => 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f' -- Nestor (admin)
-- ) as contactos_movidos;

-- ============================================================
-- Verificación: cuántos contactos quedó teniendo cada quién
-- ============================================================
select p.full_name, count(*) as contactos
from contacts c
join profiles p on p.id = c.owner_id
group by p.full_name
order by contactos desc;
