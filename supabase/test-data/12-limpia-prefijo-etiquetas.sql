-- ---------------------------------------------------------------
-- Quita el prefijo "prospecto|" de las etiquetas existentes.
-- "prospecto|miguelhidalgo" -> "miguelhidalgo". Queda solo la alcaldía.
--
-- El prefijo identificaba el lote/origen en el CSV, no es dato del
-- negocio. Ya se corrigió en el importador (ImportDialog.tsx) para que los
-- lotes futuros no lo vuelvan a agregar — esto es solo la limpieza de lo
-- que ya está cargado.
--
-- Corre primero el SELECT de verificación (cuenta cuántos contactos tienen
-- HOY algún tag con el prefijo), luego el UPDATE, luego el SELECT final
-- (debería dar 0). Los tres números — antes, después, y la diferencia —
-- son lo que hay que revisar antes de dar esto por cerrado.
-- ---------------------------------------------------------------

-- 1) Antes
select count(*) as contactos_con_prefijo_antes
from contacts
where exists (select 1 from unnest(tags) t where t like 'prospecto|%');

-- 2) Limpieza — por elemento del arreglo, no por arreglo completo: si
-- algún día un contacto tiene más de una etiqueta, solo se toca la que
-- trae el prefijo.
update contacts
set tags = (
  select array_agg(regexp_replace(t, '^prospecto\|', ''))
  from unnest(tags) as t
)
where exists (select 1 from unnest(tags) t where t like 'prospecto|%');

-- 3) Después (debería ser 0)
select count(*) as contactos_con_prefijo_despues
from contacts
where exists (select 1 from unnest(tags) t where t like 'prospecto|%');
