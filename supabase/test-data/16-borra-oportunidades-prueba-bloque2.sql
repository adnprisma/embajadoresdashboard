-- ---------------------------------------------------------------
-- Borra las 2 oportunidades de prueba del bloque 2 (verificación en vivo:
-- estimado vacío, arrastre a Ganada, "Mover a...", volumen cerrado).
-- Ambas quedaron en la etapa "won" (Cerrado), así que ni delete_opportunity()
-- ni un DELETE directo con RLS normal las tocan — ver
-- 0017_opportunity_delete_guard.sql. Esto es justo la corrección contable
-- por SQL directo que esa migración deja abierta.
--
-- Corre primero el SELECT para confirmar que son exactamente estas 2 filas
-- y ningún otro dato real. Luego el DELETE.
-- ---------------------------------------------------------------

-- 1) Confirma qué se va a borrar
select id, business_name, stage_id, estimated_value, closed_value, mrr, owner_id, created_at
from opportunities
where business_name like 'ZZZ PRUEBA BLOQUE2%';

-- 2) Borra
delete from opportunities
where business_name like 'ZZZ PRUEBA BLOQUE2%';
