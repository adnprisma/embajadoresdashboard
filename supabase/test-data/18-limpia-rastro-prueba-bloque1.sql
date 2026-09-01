-- ---------------------------------------------------------------
-- Bloque 1 se probó en vivo sobre 3 contactos reales de Valeria (Vetalia
-- Las Águilas, Dog City Rio Rhin 24 Horas, Vip – Vet) y se revirtieron a
-- "sin contactar" al terminar — pero las filas de status_change en
-- interactions nunca se borraron. El embudo semanal mide FLUJO (llegó a un
-- estado), no estado actual, así que las sigue contando aunque el estado
-- ya esté revertido. Esto ensució "Foto del universo" en /equipo con un
-- "interesado: 1" de Valeria que no es real.
--
-- Corre 1 y 2 primero (verificación, no tocan nada) y pásame los
-- resultados. Corre 3 (DELETE) solo después. Acotado a los 3 contactos de
-- prueba por nombre — nada de Gladys ni de ningún otro contacto real.
-- ---------------------------------------------------------------

-- 1) ¿Algún contacto de Valeria está HOY como "interesado" de verdad?
-- Si sale uno de los 3 de prueba, el estado actual también quedó mal
-- revertido (no solo el historial) y hay que corregirlo aparte, por el
-- dropdown de la ficha o con un UPDATE explícito — decide con este dato.
select c.id, c.business_name, c.status
from contacts c
where c.owner_id = (select id from profiles where full_name = 'Valeria Coto')
  and c.status = 'interesado';

-- 2) Historial de status_change de los 3 contactos de prueba, tal como se
-- ve hoy — negocio, de qué estado a cuál, y cuándo.
select c.business_name, i.from_status, i.to_status, i.occurred_at
from interactions i
join contacts c on c.id = i.contact_id
where i.kind = 'status_change'
  and c.business_name in ('Vetalia Las Águilas', 'Dog City Rio Rhin 24 Horas', 'Vip – Vet')
order by c.business_name, i.occurred_at;

-- 3) Borra SOLO las filas de status_change de esos 3 contactos — el resto
-- de su historial (si hubiera otro tipo de interaction) no se toca.
delete from interactions
where kind = 'status_change'
  and contact_id in (
    select id from contacts
    where business_name in ('Vetalia Las Águilas', 'Dog City Rio Rhin 24 Horas', 'Vip – Vet')
  );
