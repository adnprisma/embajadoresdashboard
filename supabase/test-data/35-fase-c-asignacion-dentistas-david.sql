-- ---------------------------------------------------------------
-- Fase C del lote de dentistas del 7 de septiembre de 2026: los 237
-- contactos con teléfono (tag 'lote-dent-sep-2026') van COMPLETOS a David
-- Nava — giro propio en vez de zona, para probar el modelo antes de
-- comprometerse en los 30 nichos que vienen.
--
-- Razón (decisión del usuario, no propuesta por el agente): Gladys tiene
-- 143 contactos sin_contactar y Valeria 155 (el usuario mencionó 171 para
-- Valeria; verificado en vivo antes de asignar y no cuadró — se reporta la
-- discrepancia, no se fuerza el número. No cambia la decisión: el
-- backlog de Valeria es grande de cualquier forma). Darles más leads no
-- aumenta lo que se trabaja, solo reparte la misma atención. David tenía
-- 1 contacto y capacidad libre.
--
-- Los 452 (453 con Virtuodent GAM, ver 33-crea-contacto-virtuodent-gam.sql)
-- sin teléfono NO se tocan aquí — siguen en reserva del admin.
--
-- reassign_contacts() limpia in_reserve automáticamente (ver
-- 0021_contact_reserve_and_tags.sql) y no toca la atribución de
-- interactions — solo mueve owner_id en contacts/prospect_analysis/
-- tasks/opportunities/appointments y registra en contact_assignments.
-- ---------------------------------------------------------------

-- 1) La asignación real. Debe regresar 237.
select reassign_contacts(
  (select array_agg(id) from contacts where 'lote-dent-sep-2026' = any(tags)),
  'e88521e0-7fca-4022-b98c-a9695561757b', -- David Nava
  'Fase C: los 237 dentistas con teléfono van completos a David — giro propio en vez de zona, para probar el modelo antes de comprometerse en los 30 nichos que vienen. Gladys y Valeria ya tienen backlog sin contactar grande; David tiene capacidad libre.',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 2) Verificación — totales de las 4 personas y que el grupo sin teléfono
-- no se movió.
select p.full_name, count(*) filter (where c.status = 'sin_contactar') as sin_contactar, count(*) as total
from profiles p
left join contacts c on c.owner_id = p.id
where p.role = 'seller'
group by p.full_name
order by p.full_name;

select
  count(*) filter (where 'lote-dent-sep-2026' = any(tags) and in_reserve = false and owner_id = 'e88521e0-7fca-4022-b98c-a9695561757b') as con_numero_a_david_debe_ser_237,
  count(*) filter (where industry = 'Dentista' and 'visitar' = any(tags) and in_reserve = true) as sin_numero_en_reserva_debe_ser_453
from contacts;
