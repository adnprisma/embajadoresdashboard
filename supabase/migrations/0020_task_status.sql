-- ---------------------------------------------------------------
-- Bloque 4 — tablero de tareas. `done` (booleano) no alcanza para tres
-- estados (Pendiente · En proceso · Hecha), así que se agrega `status`.
--
-- Partida en dos migraciones a propósito — no hay ventana de despliegue que
-- funcione agregando y borrando `done` en el mismo paso (CLAUDE.md §5): si
-- se corre antes del push, el código viejo en producción sigue leyendo
-- `done`, que ya no existiría; si se corre después, el código nuevo lee
-- `status`, que todavía no existiría. Esta es la migración A: agrega
-- `status`, la rellena desde `done`, y NO toca `done` — las dos columnas
-- conviven mientras se confirma que todo funciona. `done` se borra en una
-- migración B posterior, aparte, cuando se confirme.
--
-- Mientras conviven: el código nuevo escribe SOLO status. `done` queda
-- congelada (viva pero sin escribirse), no sincronizada — dos fuentes de
-- verdad para lo mismo sería peor que la ventana de transición.
-- ---------------------------------------------------------------

alter table tasks add column status text not null default 'pending'
  check (status in ('pending', 'in_progress', 'done'));

update tasks set status = case when done then 'done' else 'pending' end;
