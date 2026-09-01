-- ---------------------------------------------------------------
-- "Angiru Centro Veterinario" (cfb81883-a6da-4499-959a-1c840b66752f) salió
-- como "interesado" para Valeria, pero no estaba en la lista de los 3
-- contactos de prueba del bloque 1. Antes de tocarlo: ¿tiene historial de
-- status_change, y cuándo?
-- ---------------------------------------------------------------

select c.business_name, i.from_status, i.to_status, i.occurred_at
from interactions i
join contacts c on c.id = i.contact_id
where c.id = 'cfb81883-a6da-4499-959a-1c840b66752f'
order by i.occurred_at;
