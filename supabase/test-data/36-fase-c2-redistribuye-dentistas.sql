-- ---------------------------------------------------------------
-- Redistribución de los 237 dentistas con teléfono (hoy todos con David
-- Nava, ver 35-fase-c-asignacion-dentistas-david.sql) — segunda pasada de
-- Fase C, con el criterio ya no por "todo el giro a una persona" sino por
-- alcaldía, repartido entre David y Néstor, con el resto de vuelta a
-- reserva hasta que ambos trabajen lo que ya tienen.
--
-- Verificado antes de escribir esto: los 237 siguen sin_contactar (0
-- cambiaron de estado desde que se cargaron) y siguen siendo de David —
-- no hay historial de interactions que mover ni atribución que se pierda.
--
-- Néstor Espinosa (e83c7159-de3b-4ff8-a0e2-c4eb408715d5, role=seller):
--   Magdalena Contreras (24) + Miguel Hidalgo (16) + Coyoacán (13) = 53
-- David Nava (e88521e0-7fca-4022-b98c-a9695561757b, role=seller) — se queda:
--   Cuauhtémoc (40) + Tlalpan (8) = 48 (no se toca, ya son suyos)
-- Prisma / admin (cf32e354-ce7b-47a3-8560-7e6f8cea4a9f, role=admin) — reserva:
--   Álvaro Obregón(20) + Cuajimalpa(20) + Venustiano Carranza(18) +
--   Iztacalco(14) + Iztapalapa(14) + Milpa Alta(11) + Tláhuac(10) +
--   Benito Juárez(9) + Gustavo A. Madero(9) + Xochimilco(6) +
--   Azcapotzalco(5) = 136
--
-- Vía reassign_contacts() para los tres movimientos — nunca un UPDATE
-- directo: la función sincroniza owner_id en prospect_analysis/tasks/
-- opportunities/appointments y deja rastro en contact_assignments, algo
-- que un UPDATE aparte tendría que replicar a mano y tarde o temprano se
-- le olvidaría a alguien.
--
-- 0030_reassign_to_reserve.sql (aplicada antes que este archivo) es lo
-- que hace posible el tercer movimiento: reassign_contacts() ahora acepta
-- un destino role='admin' y calcula in_reserve=true en ese caso — antes
-- solo aceptaba role='seller' con in_reserve=false fijo. El trigger
-- trg_enforce_owner_reserve_consistency (misma migración) rechaza
-- cualquier combinación dueño/reserva que no sea admin+true o
-- seller+false, así que un error en este script no puede dejar un
-- contacto con dueña Y en reserva a la vez.
--
-- Los 604 que ya estaban en reserva (453 dentistas sin teléfono + 151
-- veterinarias) no se tocan — el filtro de cada bloque es explícito por
-- alcaldía + tag de lote, nunca "todo lo que sea de David".
-- ---------------------------------------------------------------

-- 1) Néstor Espinosa — 53. Debe regresar 53.
select reassign_contacts(
  (select array_agg(id) from contacts
    where 'lote-dent-sep-2026' = any(tags)
      and (
        'magdalenacontreras' = any(tags)
        or 'miguelhidalgo' = any(tags)
        or 'coyoacan' = any(tags)
      )),
  'e83c7159-de3b-4ff8-a0e2-c4eb408715d5', -- Néstor Espinosa
  'Fase C2: redistribución de dentistas por alcaldía — Magdalena Contreras, Miguel Hidalgo y Coyoacán a Néstor.',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- 2) Los 136 restantes a reserva (admin). Debe regresar 136.
select reassign_contacts(
  (select array_agg(id) from contacts
    where 'lote-dent-sep-2026' = any(tags)
      and not (
        'magdalenacontreras' = any(tags)
        or 'miguelhidalgo' = any(tags)
        or 'coyoacan' = any(tags)
        or 'cuauhtemoc' = any(tags)
        or 'tlalpan' = any(tags)
      )),
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f', -- Prisma / admin — reserva
  'Fase C2: redistribución de dentistas por alcaldía — de vuelta a reserva hasta que David y Néstor trabajen lo que ya tienen.',
  'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
);

-- David Nava no se toca — Cuauhtémoc y Tlalpan (48) ya son suyos desde la
-- carga original, sin movimiento que registrar.

-- 3) Verificación — totales de los 4 perfiles y reserva total (debe dar 740).
select p.full_name, p.role,
  count(*) filter (where c.status = 'sin_contactar') as sin_contactar,
  count(*) as total
from profiles p
left join contacts c on c.owner_id = p.id
where p.role in ('seller', 'admin')
group by p.full_name, p.role
order by p.role, p.full_name;

select count(*) as total_en_reserva_debe_ser_740 from contacts where in_reserve = true;
