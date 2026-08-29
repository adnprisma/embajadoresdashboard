-- ---------------------------------------------------------------
-- Reasigna TODOS los contactos actuales (los 104 leads de veterinarias,
-- o cualquier otro que exista) a Valeria Coto, vía reassign_contacts() —
-- misma función ya usada en 05-reassign-3-to-gladys.sql, así que mueve
-- también tareas, interacciones, oportunidades, citas y prospect_analysis
-- de cada uno, y deja el rastro en contact_assignments.
--
-- Los que ya son de Valeria se saltan solos (la función no genera un
-- movimiento vacío). clients/commissions no se tocan — nunca se mueven,
-- por diseño (ver comentario en 0011_contact_assignments.sql).
-- ---------------------------------------------------------------

select reassign_contacts(
  (select array_agg(id) from contacts),
  '1ee0df7c-188d-426e-9f25-25352abf8c34', -- Valeria Coto
  'Redistribución de cartera'
);

-- Verificación: cuántos contactos quedó teniendo cada quién
select p.full_name, count(*) as contactos
from contacts c
join profiles p on p.id = c.owner_id
group by p.full_name
order by contactos desc;
