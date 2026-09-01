-- ---------------------------------------------------------------
-- ¿Hubo alguna reasignación que ya haya reescrito owner_id de un
-- status_change real? Busca directamente el hecho, no una fecha externa de
-- cuándo se aplicó 0015: cualquier interaction de kind='status_change' cuya
-- occurred_at sea ANTERIOR a una reasignación posterior del mismo contacto
-- tiene su owner_id corrompido hoy (apunta al dueño nuevo, no a quien hizo
-- el cambio).
--
-- Si esto regresa 0 filas: no hay nada que reparar, 0018 solo protege hacia
-- adelante. Si regresa filas, son las que hay que corregir a mano antes de
-- confiar en el embudo — con from_owner/to_owner de contact_assignments ya
-- se puede saber a quién le pertenecía cada cambio realmente.
-- ---------------------------------------------------------------

select
  i.id as interaction_id,
  i.contact_id,
  i.owner_id as owner_actual_hoy,
  i.from_status,
  i.to_status,
  i.occurred_at as cambio_ocurrio,
  ca.from_owner as dueno_antes_de_reasignar,
  ca.to_owner as dueno_despues_de_reasignar,
  ca.created_at as reasignado_en
from interactions i
join contact_assignments ca on ca.contact_id = i.contact_id
where i.kind = 'status_change'
  and ca.created_at > i.occurred_at
order by i.occurred_at;
