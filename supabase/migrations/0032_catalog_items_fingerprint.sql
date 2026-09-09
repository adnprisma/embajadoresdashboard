-- ---------------------------------------------------------------
-- catalog_items_fingerprint(): reemplaza la lectura directa de
-- catalog_items que hacía scripts/check-catalog-sync.ts. Después de
-- 0031_restrict_public_policies.sql (catalog_items ya no es legible por
-- anon), ese script — que corre sin sesión, en la laptop y en el build de
-- Vercel — dejó de poder leer la tabla y reportaba los 42 conceptos como
-- "faltantes" sin estarlo. Esta función no reabre la tabla: calcula una
-- huella (hash) del catálogo completo y devuelve SOLO esa cadena — nunca
-- precios, nunca nombres, nunca coincidencias por concepto.
--
-- Por qué esto no es un oráculo (a diferencia de una función que
-- devolviera "coincide sí/no" por item, que sí lo sería): la huella
-- depende de los 42 conceptos a la vez, en un orden fijo. Para deducir un
-- precio a partir de la huella habría que adivinar los 42 valores
-- correctos simultáneamente, no uno a la vez — el espacio de búsqueda no
-- es factible. El costo real, aceptado a propósito: cuando la huella no
-- coincide, no dice CUÁL concepto cambió — el mensaje de error del script
-- (ver check-catalog-sync.ts) le dice a quien lo vea cómo averiguarlo a
-- mano.
--
-- ---------- ESPECIFICACIÓN DE LA HUELLA ----------
-- El determinismo ES todo el diseño: si esta función y el lado
-- TypeScript formatean un solo número distinto, el candado queda roto
-- para siempre (falsa alarma permanente, peor que no tener candado). Los
-- dos lados citan ESTA especificación exacta — si un lado cambia, el
-- otro cambia en el mismo commit. El lado TypeScript vive en
-- scripts/check-catalog-sync.ts.
--
-- 1. Una fila de texto por cada renglón de catalog_items.
-- 2. Orden: por item_id, ascendente, comparación de BYTES exacta —
--    "collate C" aquí, comparación simple `<`/`>` de string en
--    TypeScript. NUNCA una comparación con reglas de idioma
--    (localeCompare en JS, o el collation default de la base, que
--    puede no ser C) — dos entornos con locale distinto podrían ordenar
--    los mismos 42 ids distinto y producir una huella distinta de datos
--    idénticos.
-- 3. Cada fila se arma así, con "|" entre los 4 campos:
--      item_type || '|' || item_id || '|' || precio || '|' || whatsapp
--    - precio: el numeric(12,2) convertido a texto tal cual — la columna
--      tiene escala fija en 2 decimales, así que price::text ya da
--      "15000.00", nunca "15000" ni "15,000.00" (sin separador de
--      miles). El lado TypeScript usa price.toFixed(2) — mismo formato,
--      mismo resultado, para el mismo número.
--    - whatsapp: includes_whatsapp::text da "true"/"false" en
--      minúsculas. TypeScript: String(includesWhatsapp), mismo formato.
-- 4. Las filas (ya ordenadas) se unen con un solo salto de línea LF
--    (chr(10) / "\n") — sin CR, sin separador extra al final.
-- 5. SHA-256 sobre esa cadena completa, codificada en UTF-8 (el default
--    de ambos lados, no hace falta forzarlo).
-- 6. Salida en hexadecimal, minúsculas, sin prefijo — encode(..., 'hex')
--    en Postgres ya es minúsculas por default; crypto.createHash en
--    Node con .digest('hex') también.
-- ---------------------------------------------------------------

create function catalog_items_fingerprint()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select encode(
    digest(
      string_agg(
        item_type || '|' || item_id || '|' || price::text || '|' || includes_whatsapp::text,
        chr(10)
        order by item_id collate "C"
      ),
      'sha256'
    ),
    'hex'
  )
  from catalog_items;
$$;

-- Grant explícito, nunca heredado del default de "create function" — el
-- script corre sin sesión (laptop, build de Vercel), así que anon es el
-- único rol que puede llamarla. authenticated también, por si algún día
-- una pantalla del dashboard necesita lo mismo sin volver a exponer la
-- tabla.
revoke all on function catalog_items_fingerprint() from public;
grant execute on function catalog_items_fingerprint() to anon, authenticated;

-- ---------- verificación post-migración ----------
-- No compara contra pricing.ts (eso lo hace el script) — solo confirma
-- que la función existe, corre, y devuelve una huella con la forma
-- esperada (64 caracteres hexadecimales, sha256 en hex minúsculas) sobre
-- los datos reales de hoy.
do $$
declare
  v_fp text;
begin
  select catalog_items_fingerprint() into v_fp;

  if v_fp is null then
    raise exception 'catalog_items_fingerprint() devolvió null — ¿catalog_items está vacía?';
  end if;

  if v_fp !~ '^[0-9a-f]{64}$' then
    raise exception 'catalog_items_fingerprint() devolvió algo que no es un sha256 hex de 64 caracteres: %', v_fp;
  end if;
end $$;
