// ---------------------------------------------------------------
// Carga de un lote de prospección DIRECTO de los HTML — contacto y
// análisis en la misma pasada, sin CSV intermedio.
//
// Por qué existe: el CSV era una derivación con pérdidas de los mismos
// HTML — "Veterinaria Molinos" y "Virtuodent Boutique Dental" existían en
// las fichas de análisis y nunca llegaron al CSV, dos veces la misma
// clase de omisión. Con contacto y análisis saliendo de la MISMA fila
// parseada, el contact_id se conoce al momento de insertar: desaparece
// la necesidad de cruzar por nombre+alcaldía después (con su guarda de
// cobertura y su índice único de respaldo) — esas dos siguen ahí como
// segunda defensa, pero ya no son el único obstáculo entre un bug de
// cruce y una fila mal pegada.
//
// EXIGE un archivo de decisiones (--decisions, generado y llenado a mano
// a partir de report-prospection-lot.mjs) sin ningún "decision": null
// pendiente. Sin eso, no se genera una sola línea de SQL — el juicio de
// negocio de Fase A (líneas compartidas, cadenas, teléfonos mal
// formados) no es opcional ni algo que se pueda "saltar por ahora".
//
// Idempotencia: correr el mismo HTML dos veces es un no-op real, no solo
// seguro del lado del análisis como el flujo viejo. El paso 1 (contactos)
// solo inserta los que no tengan ya un match por nombre+alcaldía — la
// segunda corrida no encuentra ninguno nuevo. El paso 2 (análisis) sigue
// protegido igual que antes (not exists + índice único de
// 0029_prospect_analysis_contact_unique.sql).
//
// Uso:
//   node scripts/load-prospection-lot.mjs --decisions <decisiones.json>
//     [--owner <uuid-admin>] [--accept-mismatch <negocio> [...]] [--dry-run]
//     <carpeta-html>
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { expandToHtmlFiles, normalize, parseHtmlFiles } from "./lib/prospection-html.mjs";
import { findMalformedPhones, findNameClusters, findPhoneClusters, normalizePhone } from "./lib/lot-analysis.mjs";

const ADMIN_ID_DEFAULT = "cf32e354-ce7b-47a3-8560-7e6f8cea4a9f";

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function sqlBool(value) {
  if (value === null || value === undefined) return "null";
  return value ? "true" : "false";
}
function sqlTextArray(values) {
  if (!values || values.length === 0) return "array[]::text[]";
  return `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
}

// ---------- CLI ----------
const argv = process.argv.slice(2);
let decisionsPath = null;
let ownerId = ADMIN_ID_DEFAULT;
let dryRun = false;
const acceptedMismatches = new Set();
const inputPaths = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--decisions") {
    decisionsPath = argv[++i];
  } else if (arg === "--owner") {
    ownerId = argv[++i];
  } else if (arg === "--accept-mismatch") {
    acceptedMismatches.add(normalize(argv[++i] ?? ""));
  } else if (arg === "--dry-run") {
    dryRun = true;
  } else {
    inputPaths.push(arg);
  }
}

if (!decisionsPath || inputPaths.length === 0) {
  console.error(
    "Uso: node scripts/load-prospection-lot.mjs --decisions <decisiones.json> [--owner <uuid>] [--dry-run] <carpeta-html>",
  );
  process.exit(1);
}

// ---------- archivo de decisiones: todo o nada ----------
let decisiones;
try {
  decisiones = JSON.parse(readFileSync(decisionsPath, "utf-8"));
} catch (err) {
  console.error(`✗ No se pudo leer/parsear ${decisionsPath}: ${err.message}`);
  process.exit(1);
}

const pendientes = [];
if (!decisiones.loteTagConTelefono) pendientes.push('"loteTagConTelefono" sin definir');
for (const [i, c] of (decisiones.nameClusters ?? []).entries()) {
  if (c.decision !== "misma-marca" && c.decision !== "no-es-duplicado") {
    pendientes.push(`nameClusters[${i}] (${c.negocios?.map((n) => n.business_name).join(" / ")}): decision inválida o pendiente`);
  }
}
const MALFORMED_DECISIONS = new Set(["telefono-revisar", "sin-telefono-valido", "ya-cubierto-por-otra-etiqueta"]);
for (const [i, m] of (decisiones.malformedPhones ?? []).entries()) {
  if (!MALFORMED_DECISIONS.has(m.decision)) {
    pendientes.push(`malformedPhones[${i}] (${m.business_name}): decision inválida o pendiente (usa: ${[...MALFORMED_DECISIONS].join(" | ")})`);
  }
}
if (pendientes.length > 0) {
  console.error(
    `✗ ${decisionsPath} tiene decisiones sin resolver — no se genera SQL:\n` + pendientes.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}

// ---------- parseo ----------
const htmlFiles = expandToHtmlFiles(inputPaths);
let records, mismatches, totalCardsFound;
try {
  ({ records, mismatches, totalCardsFound } = parseHtmlFiles(htmlFiles));
} catch (err) {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
}

if (records.length > 0 && decisiones.giro !== records[0].giro) {
  console.error(
    `✗ El archivo de decisiones es para giro "${decisiones.giro}", pero los HTML resuelven a "${records[0].giro}". ` +
      `¿Es el archivo de decisiones correcto para esta carpeta?`,
  );
  process.exit(1);
}

const unacceptedMismatches = mismatches.filter((m) => !acceptedMismatches.has(m.key));
if (mismatches.length > 0) {
  console.error(`\n⚠ ${mismatches.length} mismatch(es) tabla/tarjeta:`);
  for (const m of mismatches) {
    console.error(`  - [${m.file}] "${m.businessName}" ${m.problem}${acceptedMismatches.has(m.key) ? " (aceptado)" : ""}`);
  }
}
if (unacceptedMismatches.length > 0) {
  console.error(
    `\n✗ ${unacceptedMismatches.length} mismatch(es) sin declarar. No se genera SQL:\n` +
      unacceptedMismatches.map((m) => `    --accept-mismatch "${m.businessName}"`).join("\n"),
  );
  process.exit(1);
}

const accountedFor = records.length + mismatches.length;
if (totalCardsFound !== accountedFor) {
  console.error(
    `\n✗ Guardián de conteo falló: ${totalCardsFound} fichas encontradas, ${accountedFor} contabilizadas. No se genera SQL.`,
  );
  process.exit(1);
}

// ---------- recalcula los mismos clusters que vio report-prospection-lot.mjs ----------
// Se recalculan (no se leen del archivo de decisiones) para que las
// ETIQUETAS salgan de los datos actuales del HTML, no de una foto vieja —
// el archivo de decisiones solo aporta el JUICIO (qué cluster es cadena
// real, qué teléfono se carga igual), nunca los datos en sí.
function keyOf(r) {
  return `${normalize(r.business_name)}|${r.alcaldiaTag}`;
}

const phoneClusterMembers = new Set();
for (const group of findPhoneClusters(records)) {
  for (const r of group) phoneClusterMembers.add(keyOf(r));
}

const nameClusterDecisionByKey = new Map();
for (const cluster of decisiones.nameClusters ?? []) {
  for (const negocio of cluster.negocios ?? []) {
    nameClusterDecisionByKey.set(`${normalize(negocio.business_name)}|${negocio.alcaldiaTag}`, cluster.decision);
  }
}
const misplacedNameEntries = [];
for (const group of findNameClusters(records)) {
  for (const r of group) {
    const k = keyOf(r);
    if (!nameClusterDecisionByKey.has(k)) misplacedNameEntries.push(r.business_name);
  }
}
if (misplacedNameEntries.length > 0) {
  console.error(
    `\n✗ Estos negocios forman un cluster de nombre repetido HOY pero no están en el archivo de decisiones ` +
      `(¿decisiones desactualizado respecto al HTML actual?): ${misplacedNameEntries.join(", ")}. Corre report-prospection-lot.mjs de nuevo.`,
  );
  process.exit(1);
}

const malformedDecisionByKey = new Map();
for (const m of decisiones.malformedPhones ?? []) {
  malformedDecisionByKey.set(`${normalize(m.business_name)}|${m.alcaldiaTag}`, m.decision);
}
const misplacedMalformed = [];
for (const { record } of findMalformedPhones(records)) {
  const k = keyOf(record);
  if (!malformedDecisionByKey.has(k)) misplacedMalformed.push(record.business_name);
}
if (misplacedMalformed.length > 0) {
  console.error(
    `\n✗ Estos teléfonos se ven mal formados HOY pero no están en el archivo de decisiones: ${misplacedMalformed.join(", ")}. ` +
      `Corre report-prospection-lot.mjs de nuevo.`,
  );
  process.exit(1);
}

// ---------- tags + teléfono final por registro ----------
for (const r of records) {
  const k = keyOf(r);
  const tags = [r.alcaldiaTag];

  const malformedDecision = malformedDecisionByKey.get(k);
  let phone = r.phone;
  if (malformedDecision === "sin-telefono-valido") {
    phone = null;
  } else if (malformedDecision === "telefono-revisar") {
    tags.push("telefono-revisar");
  }

  tags.push(phone ? decisiones.loteTagConTelefono : "visitar");

  if (phoneClusterMembers.has(k)) tags.push(decisiones.sharedPhoneTag);
  const nameDecision = nameClusterDecisionByKey.get(k);
  if (nameDecision === "misma-marca") tags.push(decisiones.chainTag);

  r.finalPhone = phone;
  r.finalTags = tags;
}

console.error(`\nFichas a procesar: ${records.length}`);
console.error(`Con teléfono final: ${records.filter((r) => r.finalPhone).length}`);
console.error(`Con "${decisiones.sharedPhoneTag}": ${records.filter((r) => r.finalTags.includes(decisiones.sharedPhoneTag)).length}`);
console.error(`Con "${decisiones.chainTag}": ${records.filter((r) => r.finalTags.includes(decisiones.chainTag)).length}`);
console.error(`Con "telefono-revisar": ${records.filter((r) => r.finalTags.includes("telefono-revisar")).length}`);

if (dryRun) {
  console.error("\n— modo simulación (--dry-run): no se generó SQL. —");
  process.exit(0);
}

// ---------- SQL ----------
const VALUES_COLUMNS =
  "business_name, giro, alcaldia_tag, tags, colonia, address, phone, email, web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat, has_blog, has_redes, gaps, note, source_file";

const rows = records
  .map((r) => {
    return `  (${sqlString(r.business_name)}, ${sqlString(r.giro)}, ${sqlString(r.alcaldiaTag)}, ${sqlTextArray(r.finalTags)}, ${sqlString(r.colonia)}, ${sqlString(r.address)}, ${sqlString(r.finalPhone)}, ${sqlString(r.email)}, ${sqlString(r.web_note)}, ${r.score ?? "null"}, ${sqlBool(r.is_urgent)}, ${sqlBool(r.has_web)}, ${sqlBool(r.has_whatsapp)}, ${sqlBool(r.has_reservas)}, ${sqlBool(r.has_crm)}, ${sqlBool(r.has_chat)}, ${sqlBool(r.has_blog)}, ${sqlBool(r.has_redes)}, ${sqlTextArray(r.gaps)}, ${sqlString(r.note)}, ${sqlString(r.source_file)})`;
  })
  .join(",\n");

// Match nombre+alcaldía: ahora es igualdad directa contra alcaldia_tag —
// ya no hace falta la comparación por subcadena que necesitaba el flujo
// viejo (ver parse-prospect-analysis.mjs) porque aquí la alcaldía ya se
// resolvió a la etiqueta corta canónica en JS (ALCALDIA_TAGS), tanto para
// los contactos que se crean en este mismo run como para los que ya
// existían.
const MATCH_CONDITION = `lower(trim(c.business_name)) = lower(trim(v.business_name)) and v.alcaldia_tag = any(c.tags)`;

console.log(`-- ---------------------------------------------------------------
-- Carga generada por scripts/load-prospection-lot.mjs — contacto y
-- análisis en la misma pasada, derivados directo del HTML (sin CSV
-- intermedio). No editar a mano: corregir el origen (HTML o el archivo
-- de decisiones) y volver a correr el script.
--
-- Decisiones de Fase A aplicadas desde ${decisionsPath} (commitéalo junto
-- con este SQL para que el juicio de negocio quede en el historial).
--
-- Idempotente de verdad: el bloque 1) solo crea los contactos que no
-- tengan ya un match por nombre+alcaldía — correr esto dos veces con el
-- mismo HTML no duplica nada en NINGUNO de los dos lados (contactos ni
-- análisis).
-- ---------------------------------------------------------------

drop table if exists _lot_load;

create temporary table _lot_load (
  business_name text, giro text, alcaldia_tag text, tags text[], colonia text, address text, phone text, email text,
  web_note text, score int, is_urgent boolean, has_web boolean, has_whatsapp boolean, has_reservas boolean,
  has_crm boolean, has_chat boolean, has_blog boolean, has_redes boolean, gaps text[], note text, source_file text
);

insert into _lot_load (${VALUES_COLUMNS}) values
${rows};

-- 1) Contactos nuevos — SOLO los que no tengan ya un match por nombre+alcaldía.
--    Pasa por import_contacts() (mismo camino que ImportDialog.tsx): valida
--    owner, arma contact_assignments, decide in_reserve. El 5º argumento
--    explícito (null) desambigua el overload duplicado de import_contacts()
--    (ver CLAUDE.md y 0028_drop_duplicate_import_contacts.sql) — deja de
--    hacer falta una vez que esa migración corra, pero no estorba mientras
--    tanto.
select import_contacts(
  (
    select jsonb_agg(jsonb_build_object(
      'business_name', v.business_name,
      'phone', v.phone,
      'email', v.email,
      'industry', v.giro,
      'tags', v.tags,
      'notes', v.note
    ))
    from _lot_load v
    where not exists (select 1 from contacts c where ${MATCH_CONDITION})
  ),
  ${sqlString(ownerId)}::uuid,
  ${sqlString(`Carga directa de HTML — ${decisiones.giro}, ${decisionsPath}`)},
  ${sqlString(ownerId)}::uuid,
  null
);

-- 2) Guarda de cobertura — con contactos creados en el paso 1, esto no
--    debería encontrar nada nunca; se deja como red de segunda línea, no
--    como la defensa principal (esa es que el contact_id ya se conoce).
do $$
declare
  v_missing text;
  v_ambiguous text;
begin
  select string_agg(format('%s (%s)', v.business_name, v.alcaldia_tag), ', ') into v_missing
  from _lot_load v
  left join contacts c on ${MATCH_CONDITION}
  where c.id is null;

  if v_missing is not null then
    raise exception 'Cobertura incompleta tras el paso 1 (no debería pasar): %.', v_missing;
  end if;

  select string_agg(format('%s (contact_id %s): %s fichas candidatas', t.business_name, t.id, t.n), ', ')
  into v_ambiguous
  from (
    select c.id, c.business_name, count(*) as n
    from _lot_load v
    join contacts c on ${MATCH_CONDITION}
    group by c.id, c.business_name
    having count(*) > 1
  ) as t;

  if v_ambiguous is not null then
    raise exception 'Cruce ambiguo (no debería pasar): %.', v_ambiguous;
  end if;
end $$;

-- 3) Análisis — protegido además por el índice único de
--    0029_prospect_analysis_contact_unique.sql.
insert into prospect_analysis (
  owner_id, contact_id, business_name, alcaldia, colonia, address, phone, email,
  web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat,
  has_blog, has_redes, gaps, note, source_file
)
select
  c.owner_id, c.id, v.business_name, v.alcaldia_tag, v.colonia, v.address, v.phone, v.email,
  v.web_note, v.score, v.is_urgent, v.has_web, v.has_whatsapp, v.has_reservas, v.has_crm, v.has_chat,
  v.has_blog, v.has_redes, v.gaps, v.note, v.source_file
from _lot_load v
join contacts c on ${MATCH_CONDITION}
and not exists (
  select 1 from prospect_analysis pa where pa.contact_id = c.id
);

drop table _lot_load;
`);
