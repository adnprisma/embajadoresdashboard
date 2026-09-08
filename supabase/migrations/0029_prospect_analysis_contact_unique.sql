-- ---------------------------------------------------------------
-- Índice único en prospect_analysis.contact_id — hoy no existe, y por eso
-- un cruce ambiguo (nombre repetido entre sucursales de distinta alcaldía,
-- sin desambiguar por alcaldía) puede insertar más de una ficha para el
-- mismo contacto sin que nada truene. Se encontró al cargar el lote de
-- dentistas del 7 de septiembre de 2026: "MC Dent" y "Consultorio de
-- Especialidades Dentales" tienen 2 sucursales cada una con el mismo
-- nombre en alcaldías distintas — un JOIN solo por nombre (como tenía
-- scripts/parse-prospect-analysis.mjs hasta ahora) las cruza en producto
-- cruzado (2 fichas × 2 contactos = 4 combinaciones), y sin esta
-- restricción, las 4 se insertan igual.
--
-- El arreglo real es que el script cruce por nombre Y alcaldía (ver el
-- propio script) — este índice es la segunda defensa, no la primera: si
-- algún script futuro (o alguien corriendo SQL a mano) vuelve a cruzar
-- solo por nombre, esto lo vuelve IMPOSIBLE en vez de solo detectable,
-- protegiendo contra cualquier camino de escritura, no solo este script.
--
-- Verificado antes de crear este índice (obligatorio, no opcional): hoy
-- NINGÚN contact_id tiene más de una fila en prospect_analysis (0 de 539
-- fichas de veterinaria, incluidas) — el índice no necesita backfill ni
-- limpieza previa.
--
-- `where contact_id is not null` porque la columna sí permite null (un
-- análisis sin contacto vinculado, si algún día existiera ese caso) y un
-- índice único normal trataría cada null como distinto de los demás de
-- cualquier forma — el `where` es solo para dejar la intención explícita,
-- no porque el comportamiento cambie.
-- ---------------------------------------------------------------

create unique index prospect_analysis_contact_id_key
  on prospect_analysis (contact_id)
  where contact_id is not null;
