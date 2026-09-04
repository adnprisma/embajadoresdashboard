-- ---------------------------------------------------------------
-- Fase C del reparto de los 351 contactos en reserva (ver conversación:
-- Fase A = reporte, Fase B = etiquetas, ya registrada en
-- 24-fase-b-lote-sep-2026.sql — Fase C = asignación).
--
-- Grupo 1 (200, teléfono válido) se reparte por alcaldía en dos bloques:
--   - Bloque sur-oriente → Gladys Strevel (5ddc5080-240a-48ae-b0e6-71cbe1931c72):
--     tlalpan, iztacalco, tlahuac, xochimilco, milpaalta = 93
--   - Bloque norte-poniente → Valeria Coto (1ee0df7c-188d-426e-9f25-25352abf8c34):
--     azcapotzalco, gustavoamadero, venustianocarranza, cuajimalpa,
--     magdalenacontreras = 107
--
-- reassign_contacts() limpia in_reserve automáticamente y NO toca
-- interactions (la atribución de interactions no se toca — regla del
-- reparto). Grupo 3 (151, ni teléfono ni correo) se queda en reserva,
-- sin tocar aquí.
--
-- NOTA: este script se escribe DESPUÉS de que las dos llamadas ya se
-- ejecutaron en producción — documenta lo ya corrido, no algo pendiente.
-- Confirmado contra contact_assignments (fuente de verdad, no memoria):
-- ambas filas existen con estos mismos reason/assigned_by/conteos.
-- ---------------------------------------------------------------

-- 1) Bloque sur-oriente → Gladys Strevel. Debe regresar 93.
select reassign_contacts(
  (select array_agg(id) from contacts
    where in_reserve = true
      and phone is not null
      and tags && array['tlalpan','iztacalco','tlahuac','xochimilco','milpaalta']),
  '5ddc5080-240a-48ae-b0e6-71cbe1931c72',
  'Reparto lote-sep-2026, bloque sur-oriente',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 2) Bloque norte-poniente → Valeria Coto. Debe regresar 107.
select reassign_contacts(
  (select array_agg(id) from contacts
    where in_reserve = true
      and phone is not null
      and tags && array['azcapotzalco','gustavoamadero','venustianocarranza','cuajimalpa','magdalenacontreras']),
  '1ee0df7c-188d-426e-9f25-25352abf8c34',
  'Reparto lote-sep-2026, bloque norte-poniente',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 3) Verificación — confirmado ya contra producción el 2026-09-04:
--    Gladys Strevel:  owner, in_reserve=false, 176 (83 previos + 93 de aquí)
--    Valeria Coto:    owner, in_reserve=false, 211 (104 previos + 107 de aquí)
--    Prisma (admin):  owner, in_reserve=true,  151 (grupo 3, intacto)
--    total = 538, sin huérfanos.
select p.full_name as owner, c.in_reserve, count(*)
from contacts c
left join profiles p on p.id = c.owner_id
group by p.full_name, c.in_reserve
order by p.full_name, c.in_reserve;

-- 4) Verificación cruzada contra contact_assignments (una fila por contacto):
--    debe dar exactamente (to_owner=Gladys, reason=bloque sur-oriente, n=93)
--    y (to_owner=Valeria, reason=bloque norte-poniente, n=107).
select to_owner, reason, assigned_by, count(*)
from contact_assignments
where reason like 'Reparto lote-sep-2026%'
group by to_owner, reason, assigned_by
order by count(*) desc;
