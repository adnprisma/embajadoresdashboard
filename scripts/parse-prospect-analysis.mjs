// ---------------------------------------------------------------
// Parsea HTML de prospección (tema oscuro, marca "Digital Owner System") y
// genera el SQL para cargar prospect_analysis con las 7 capacidades
// booleanas + score + contacto + carencias + nota.
//
// A propósito NO extrae "Lo que Digital Owner System le da": es la misma
// plantilla de oferta en cada lote, no es dato del prospecto — ver
// src/config/oferta.ts, que la reemplaza con la propuesta de Prisma.
//
// Cruza dos fuentes DENTRO de cada archivo (tabla comparativa + tarjetas de
// detalle) por nombre de negocio normalizado, y reporta las que no casan —
// SIEMPRE por coincidencia exacta (tras normalizar acentos/mayúsculas),
// nunca por parecido aproximado: un match "cercano" mal resuelto es peor
// que uno que se reporta y se revisa a mano.
//
// Este script NO tiene acceso a la base de datos (solo hay anon key en
// este entorno) — por eso --known NUNCA decide qué fila se genera: solo
// puede comparar TEXTO de business_name, y dos contactos reales distintos
// pueden compartir nombre exacto (ya pasó: "Veterinaria Animalitos" existe
// como contacto viejo de una vendedora Y como contacto nuevo del lote,
// mismo texto, dos contact_id distintos — --known filtrando por texto
// saltó la ficha nueva completa, en silencio, porque el nombre "ya se veía
// conocido"). Por eso ahora --known es SOLO un aviso en la terminal
// ("este nombre ya apareció en una carga anterior, revísalo") — nunca
// excluye una fila del SQL generado. La única idempotencia real es el
// "and not exists" del INSERT, que sí opera por contact_id (correcto por
// construcción, porque compara contra la fila real, no contra texto).
//
// Guardián de conteo: al final, fichas encontradas (unión tabla+tarjetas)
// tiene que ser EXACTAMENTE fichas generadas + mismatches — si no cuadra,
// el script sale con código 1 y dice qué falta y por qué, en vez de
// generar SQL incompleto sin decirlo. Un mismatch (tabla sin tarjeta o
// viceversa) también sale con código 1 por default — hay que declararlo
// explícitamente con --accept-mismatch si de verdad es un caso a saltar,
// nunca es el comportamiento por default.
//
// Uso:
//   node scripts/parse-prospect-analysis.mjs [--known <sql1> [--known <sql2> ...]] [--accept-mismatch <negocio> [...]] [--dry-run] <html-o-carpeta> [<html-o-carpeta> ...]
//
//   --known <archivo.sql>       SQL de una carga previa (ej. 07-load-prospect-analysis.sql).
//                                Se puede repetir. Solo informativo — nunca excluye
//                                una fila del SQL generado (ver arriba).
//   --accept-mismatch <negocio> Declara explícitamente que el mismatch tabla/tarjeta
//                                de ESTE negocio (nombre tal cual aparece en el HTML,
//                                se compara normalizado) es esperado y se puede saltar.
//                                Se puede repetir. Sin esto, cualquier mismatch detiene
//                                el script con código 1 — no se genera SQL parcial.
//   --dry-run                   Reporta todo (matches, mismatches, avisos de --known)
//                                pero no imprime el SQL de carga — para confirmar
//                                el diagnóstico antes de generar nada.
//
// La salida SQL va a stdout; redirige a un archivo nuevo en supabase/test-data/.
// ---------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  if (value === null || value === undefined) return "null";
  return value ? "true" : "false";
}

function sqlTextArray(values) {
  if (!values || values.length === 0) return "null";
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

function iconState($cell) {
  if ($cell.find(".check").length) return true;
  if ($cell.find(".partial").length) return null; // presencia parcial (ej. web en subdominio gratuito) — ni true ni false
  return false;
}

// El H1 varía por giro ("Veterinarias en X, CDMX", "Dentistas en X, CDMX",
// etc.) — el patrón no fija la primera palabra a propósito, para no repetir
// el bug de asumir un solo giro que ya nos costó una revisión completa de
// oferta.ts (ver CLAUDE.md).
function alcaldiaFromTitle(h1) {
  const match = h1.match(/^\S+ en (.+), CDMX$/);
  return match ? match[1] : h1;
}

// --- CLI: separa flags de rutas, expande carpetas a sus .html ----------
const argv = process.argv.slice(2);
const knownFiles = [];
const acceptedMismatches = new Set();
let dryRun = false;
const inputPaths = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--known") {
    const value = argv[++i];
    if (!value) {
      console.error("--known necesita una ruta de archivo SQL.");
      process.exit(1);
    }
    knownFiles.push(value);
  } else if (arg === "--accept-mismatch") {
    const value = argv[++i];
    if (!value) {
      console.error("--accept-mismatch necesita el nombre del negocio (tal cual aparece en el HTML).");
      process.exit(1);
    }
    acceptedMismatches.add(normalize(value));
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else {
    inputPaths.push(arg);
  }
}

if (inputPaths.length === 0) {
  console.error(
    "Uso: node scripts/parse-prospect-analysis.mjs [--known <sql>] [--dry-run] <html-o-carpeta> [...]",
  );
  process.exit(1);
}

const htmlFiles = [];
for (const path of inputPaths) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry.endsWith(".html")) htmlFiles.push(join(path, entry));
    }
  } else {
    htmlFiles.push(path);
  }
}

// --- Idempotencia: qué negocios ya tienen prospect_analysis -------------
// Se extrae de los VALUES(...) de un INSERT INTO prospect_analysis previo
// — el primer string literal de cada fila es business_name (ver el SQL
// que este mismo script genera más abajo). No es un parser SQL general,
// solo entiende su propio formato de salida.
const knownBusinessNames = new Set();
for (const knownFile of knownFiles) {
  const content = readFileSync(knownFile, "utf-8");
  const insertSection = content.split(/insert into prospect_analysis/i)[1];
  if (!insertSection) {
    console.error(`⚠ --known ${knownFile}: no encontré un "insert into prospect_analysis" ahí adentro, lo ignoro.`);
    continue;
  }
  const rowPattern = /^\s*\('((?:[^'\\]|'')*)',/gm;
  let match;
  while ((match = rowPattern.exec(insertSection))) {
    knownBusinessNames.add(normalize(match[1].replace(/''/g, "'")));
  }
}

if (knownFiles.length === 0) {
  console.error(
    "⚠ No se pasó --known: no hay forma de saber qué negocios ya tienen prospect_analysis. " +
      "Esta corrida no puede confirmar idempotencia — solo va a parsear los HTML como si todo fuera nuevo.",
  );
}

const allRecords = [];
const nameOverlapWarnings = [];
const mismatches = [];
let totalCardsFound = 0;

for (const filePath of htmlFiles) {
  const file = filePath.split("/").pop();
  const html = readFileSync(filePath, "utf-8");
  const $ = cheerio.load(html);
  const alcaldia = alcaldiaFromTitle($("h1").first().text().trim());

  const tableByName = new Map();
  $("table tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find("td");
    const businessName = $tds.eq(1).find(".negocio-name").text().trim();
    const key = normalize(businessName);
    const prioridad = $tds.eq(11).text().trim().toUpperCase();

    tableByName.set(key, {
      businessName,
      colonia: $tds.eq(2).text().trim() || null,
      score: parseInt($tds.eq(0).text().trim(), 10) || null,
      has_web: iconState($tds.eq(3)),
      has_whatsapp: iconState($tds.eq(4)),
      has_reservas: iconState($tds.eq(5)),
      has_crm: iconState($tds.eq(6)),
      has_chat: iconState($tds.eq(7)),
      has_blog: iconState($tds.eq(8)),
      has_redes: iconState($tds.eq(9)),
      is_urgent: prioridad === "URGENTE",
    });
  });

  const cardByName = new Map();
  $(".card").each((_, card) => {
    const $card = $(card);
    if (!$card.find(".card-top").length) return; // no es una tarjeta de negocio

    const $h3 = $card.find("h3").clone();
    $h3.find("span").remove();
    const businessName = $h3.text().trim();
    const key = normalize(businessName);

    const contactLines = {};
    $card.find(".contact p").each((_, p) => {
      const $p = $(p);
      const label = $p.find(".lbl").text().replace(":", "").trim().toLowerCase();
      const value = $p.clone().find(".lbl").remove().end().text().trim();
      if (label && value) contactLines[label] = value;
    });

    const gaps = $card
      .find(".analysis:not(.oportunidad) li")
      .map((_, li) => $(li).text().trim())
      .get();

    const note = $card.find(".context-note").text().trim() || null;

    cardByName.set(key, {
      businessName,
      address: contactLines["dirección"] ?? null,
      phone: contactLines["teléfono"] ?? null,
      email: contactLines["email"] ?? null,
      web_note: contactLines["web"] ?? null,
      gaps,
      note,
    });
  });

  const allKeys = new Set([...tableByName.keys(), ...cardByName.keys()]);
  totalCardsFound += allKeys.size;
  for (const key of allKeys) {
    const t = tableByName.get(key);
    const c = cardByName.get(key);
    if (!t || !c) {
      mismatches.push({
        file,
        businessName: (t ?? c).businessName,
        key,
        problem: !t ? "está en las tarjetas pero no en la tabla comparativa" : "está en la tabla pero no en las tarjetas de detalle",
      });
      continue;
    }

    // Solo un aviso — NUNCA excluye la fila. --known compara texto, y dos
    // contactos reales distintos pueden compartir business_name exacto
    // (ver comentario de cabecera). La única idempotencia real es el
    // "and not exists" del INSERT generado más abajo, que sí opera por
    // contact_id.
    if (knownBusinessNames.has(key)) {
      nameOverlapWarnings.push({ file, businessName: t.businessName });
    }

    allRecords.push({
      business_name: t.businessName,
      alcaldia,
      colonia: t.colonia,
      address: c.address,
      phone: c.phone,
      email: c.email,
      web_note: c.web_note,
      score: t.score,
      is_urgent: t.is_urgent,
      has_web: t.has_web,
      has_whatsapp: t.has_whatsapp,
      has_reservas: t.has_reservas,
      has_crm: t.has_crm,
      has_chat: t.has_chat,
      has_blog: t.has_blog,
      has_redes: t.has_redes,
      gaps: c.gaps,
      note: c.note,
      source_file: file,
    });
  }
}

if (nameOverlapWarnings.length > 0) {
  console.error(
    `\nℹ ${nameOverlapWarnings.length} negocios comparten nombre exacto con algo de una carga anterior (--known) — ` +
      `SE INCLUYEN igual en el SQL, el "and not exists" del INSERT decide por contact_id, no por texto. ` +
      `Verifica que sea el mismo contacto reanalizado y no un homónimo (ya pasó con "Veterinaria Animalitos"):`,
  );
  for (const w of nameOverlapWarnings) {
    console.error(`  - [${w.file}] "${w.businessName}"`);
  }
  console.error("");
}

const unacceptedMismatches = mismatches.filter((m) => !acceptedMismatches.has(m.key));

if (mismatches.length > 0) {
  console.error(`\n⚠ ${mismatches.length} negocios no casaron entre tabla y tarjetas (nombre tal cual en el HTML):`);
  for (const m of mismatches) {
    const accepted = acceptedMismatches.has(m.key);
    console.error(`  - [${m.file}] "${m.businessName}" ${m.problem}${accepted ? " (aceptado vía --accept-mismatch)" : ""}`);
  }
  console.error("");
}

if (unacceptedMismatches.length > 0) {
  console.error(
    `✗ ${unacceptedMismatches.length} mismatch(es) sin declarar. No se genera SQL. ` +
      `Corrige el HTML, o si de verdad hay que saltarlos, decláralo explícito:\n` +
      unacceptedMismatches.map((m) => `    --accept-mismatch "${m.businessName}"`).join("\n"),
  );
  process.exit(1);
}

// Guardián de conteo: fichas encontradas (tabla ∪ tarjetas, por archivo)
// tiene que ser EXACTAMENTE fichas generadas + mismatches. nameOverlapWarnings
// ya no resta de allRecords (ver arriba), así que si esto no cuadra es una
// fuga real — no un negocio que "ya se veía conocido" y se saltó en silencio.
const accountedFor = allRecords.length + mismatches.length;
if (totalCardsFound !== accountedFor) {
  console.error(
    `\n✗ Guardián de conteo falló: ${totalCardsFound} fichas encontradas, pero solo ${accountedFor} ` +
      `quedaron contabilizadas (${allRecords.length} filas + ${mismatches.length} mismatches). ` +
      `Hay ${totalCardsFound - accountedFor} ficha(s) que desaparecieron sin explicación — no se genera SQL.`,
  );
  process.exit(1);
}

console.error(`Nuevos a insertar: ${allRecords.length}`);
const capKeys = ["has_web", "has_whatsapp", "has_reservas", "has_crm", "has_chat", "has_blog", "has_redes"];
const summary = { is_urgent: 0 };
for (const key of capKeys) summary[key] = 0;
for (const r of allRecords) {
  if (r.is_urgent) summary.is_urgent += 1;
  for (const key of capKeys) if (r[key] === true) summary[key] += 1;
}
if (allRecords.length > 0) {
  console.error(`Urgentes: ${summary.is_urgent}/${allRecords.length}`);
  console.error("Capacidad presente (true) por columna:", JSON.stringify(summary));
}

if (dryRun) {
  console.error("\n— modo simulación (--dry-run): no se generó SQL. —");
  process.exit(0);
}

if (allRecords.length === 0) {
  console.error("\nNada nuevo que insertar — no se generó SQL de carga.");
  process.exit(0);
}

// ---------------------------------------------------------------
// SQL de salida: el match contra contacts es por nombre de negocio EXACTO
// Y alcaldía — no solo nombre. Nombre solo no basta: dentro de un mismo
// lote, una cadena real puede tener dos sucursales con el mismo nombre en
// alcaldías distintas (Dentalia, La Clínica Dental, Dentis+a, MC Dent,
// Consultorio de Especialidades Dentales — todos casos reales del lote de
// dentistas del 7 de septiembre de 2026). Cruzar solo por nombre ahí no
// falla con un error: hace un producto cruzado silencioso (2 fichas × 2
// contactos = 4 combinaciones que pasan el JOIN), y con contact_id sin
// restricción de unicidad en prospect_analysis nada impide insertar las 4
// — pegando la ficha de una sucursal al contacto de otra. Insensible a
// mayúsculas y a espacios sobrantes en el nombre; la alcaldía se compara
// normalizada (sin acentos, sin espacios, minúscula) contra las etiquetas
// de alcaldía en contacts.tags, que ya se cargan en ese mismo formato.
//
// El INSERT lleva "and not exists (... prospect_analysis ...)" como barrera
// de idempotencia adicional — --known ya no excluye filas (ver cabecera
// del archivo) — pero ya no es la única defensa contra filas cruzadas: el
// match por alcaldía es lo que evita que el cruce sea ambiguo desde el
// principio, no algo que se limpie después.
// ---------------------------------------------------------------

const rows = allRecords
  .map((r) => {
    return `  (${sqlString(r.business_name)}, ${sqlString(r.alcaldia)}, ${sqlString(r.colonia)}, ${sqlString(r.address)}, ${sqlString(r.phone)}, ${sqlString(r.email)}, ${sqlString(r.web_note)}, ${r.score ?? "null"}, ${sqlBool(r.is_urgent)}, ${sqlBool(r.has_web)}, ${sqlBool(r.has_whatsapp)}, ${sqlBool(r.has_reservas)}, ${sqlBool(r.has_crm)}, ${sqlBool(r.has_chat)}, ${sqlBool(r.has_blog)}, ${sqlBool(r.has_redes)}, ${sqlTextArray(r.gaps)}, ${sqlString(r.note)}, ${sqlString(r.source_file)})`;
  })
  .join(",\n");

const VALUES_COLUMNS =
  "business_name, alcaldia, colonia, address, phone, email, web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat, has_blog, has_redes, gaps, note, source_file";

// Normaliza el texto de alcaldía del H1 (sin acentos, sin espacios ni
// puntuación, minúscula) — pero NO compara por igualdad exacta contra
// contacts.tags, porque el nombre que trae el H1 no siempre es el mismo
// texto que la etiqueta corta que se usó al cargar el lote: los HTML de
// veterinarias traen el nombre OFICIAL completo ("Cuajimalpa de Morelos",
// "La Magdalena Contreras"), mientras que las etiquetas de alcaldía en
// contacts.tags son la forma corta ("cuajimalpa", "magdalenacontreras") —
// verificado contra las 539 fichas de veterinaria ya cargadas: comparar
// por igualdad exacta fallaba en 62 de 539, todas por esta diferencia de
// formato, no por un error real de datos. Por eso el match es "la
// etiqueta de alcaldía aparece como subcadena del texto normalizado del
// H1" — cubre el caso corto (dentistas: "Gustavo A. Madero" ya es igual a
// la etiqueta) y el caso largo (veterinarias: "cuajimalpademorelos"
// contiene "cuajimalpa") con la misma expresión.
const ALCALDIA_NORMALIZE_SQL = (col) =>
  `lower(regexp_replace(translate(${col}, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'), '[^a-zA-Z0-9]', '', 'g'))`;

const JOIN_CONDITION = `lower(trim(c.business_name)) = lower(trim(v.business_name)) and exists (select 1 from unnest(c.tags) t where ${ALCALDIA_NORMALIZE_SQL("v.alcaldia")} like '%' || t || '%')`;

console.log(`-- ---------------------------------------------------------------
-- Carga de prospect_analysis generada por scripts/parse-prospect-analysis.mjs
-- — no editar a mano, volver a correr el script si hay que corregir algo
-- en el origen.
--
-- owner_id/contact_id salen de cruzar cada ficha contra contacts POR
-- NOMBRE Y ALCALDÍA (ver comentario arriba de VALUES_COLUMNS en el script:
-- nombre solo no basta cuando una cadena real repite nombre entre
-- sucursales de distinta alcaldía). El bloque 2) es una guarda dura con
-- DOS chequeos, no uno — ABORTA si cualquiera de los dos encuentra algo:
--   2a) fichas sin ningún contacto candidato (nombre+alcaldía sin match)
--       — así se nos escapó "Veterinaria Molinos" antes, ver
--       30-crea-contacto-veterinaria-molinos.sql.
--   2b) contactos con MÁS DE UNA ficha candidata — el lado que antes no
--       se veía: con nombre+alcaldía esto no debería pasar nunca (alcaldía
--       ya desambigua sucursales), así que si aparece es una señal real
--       de otro problema (nombre+alcaldía duplicados de verdad en
--       contacts, o un HTML con el mismo negocio repetido dos veces en la
--       misma alcaldía) — nunca "seguir de todos modos" en silencio.
-- No corras el bloque 3) si el 2) no pasó limpio.
--
-- Las fichas se cargan UNA VEZ en una tabla temporal (_pa_load) y los
-- bloques 1/2/3 la reutilizan — antes cada bloque repetía el VALUES(...)
-- completo (hasta 4 veces), y con lotes grandes (690 fichas x 19 columnas,
-- con arreglos de carencias) eso generaba más de 1 MB de SQL, poco
-- práctico para pegar en el editor de Supabase.
-- ---------------------------------------------------------------

drop table if exists _pa_load;

create temporary table _pa_load (
  business_name text, alcaldia text, colonia text, address text, phone text, email text, web_note text,
  score int, is_urgent boolean, has_web boolean, has_whatsapp boolean, has_reservas boolean, has_crm boolean,
  has_chat boolean, has_blog boolean, has_redes boolean, gaps text[], note text, source_file text
);

insert into _pa_load (${VALUES_COLUMNS}) values
${rows};

-- 1) Verificación legible (informativo — el bloque 2 es el que bloquea):
--    negocios del lote sin ningún contacto candidato por nombre+alcaldía.
select v.business_name, v.alcaldia
from _pa_load v
left join contacts c on ${JOIN_CONDITION}
where c.id is null;

-- 2) Guarda de cobertura — corre esto ANTES del INSERT.
do $$
declare
  v_missing text;
  v_ambiguous text;
begin
  -- 2a) fichas sin contacto candidato
  select string_agg(format('%s (%s)', v.business_name, v.alcaldia), ', ') into v_missing
  from _pa_load v
  left join contacts c on ${JOIN_CONDITION}
  where c.id is null;

  if v_missing is not null then
    raise exception 'Cobertura incompleta: sin contacto candidato (nombre+alcaldía) para: %. Créalos (o corrige el nombre/alcaldía) antes de cargar prospect_analysis.', v_missing;
  end if;

  -- 2b) contactos con más de una ficha candidata (no debería pasar con
  -- alcaldía ya en el match — si pasa, es señal de un duplicado real que
  -- hay que revisar a mano, nunca resolverlo solo aquí).
  select string_agg(format('%s (contact_id %s): %s fichas candidatas', t.business_name, t.id, t.n), ', ')
  into v_ambiguous
  from (
    select c.id, c.business_name, count(*) as n
    from _pa_load v
    join contacts c on ${JOIN_CONDITION}
    group by c.id, c.business_name
    having count(*) > 1
  ) as t;

  if v_ambiguous is not null then
    raise exception 'Cruce ambiguo: contacto(s) con más de una ficha candidata por nombre+alcaldía (no debería pasar): %. Revisa a mano antes de cargar.', v_ambiguous;
  end if;
end $$;

-- 3) Carga real — el "and not exists" es la barrera de idempotencia real
-- (ver cabecera del archivo): no duplica aunque --known no se haya usado.
insert into prospect_analysis (
  owner_id, contact_id, business_name, alcaldia, colonia, address, phone, email,
  web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat,
  has_blog, has_redes, gaps, note, source_file
)
select
  c.owner_id, c.id, v.business_name, v.alcaldia, v.colonia, v.address, v.phone, v.email,
  v.web_note, v.score, v.is_urgent, v.has_web, v.has_whatsapp, v.has_reservas, v.has_crm, v.has_chat,
  v.has_blog, v.has_redes, v.gaps, v.note, v.source_file
from _pa_load v
join contacts c on ${JOIN_CONDITION}
and not exists (
  select 1 from prospect_analysis pa where pa.contact_id = c.id
);

drop table _pa_load;
`);
