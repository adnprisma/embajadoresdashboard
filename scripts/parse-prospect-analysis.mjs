// ---------------------------------------------------------------
// Parsea los 4 HTML de prospección (tema oscuro, marca "Digital Owner
// System") y genera el SQL para cargar prospect_analysis con las 7
// capacidades booleanas + score + contacto + carencias + nota.
//
// A propósito NO extrae "Lo que Digital Owner System le da": es la misma
// plantilla de oferta en los 104 registros, no es dato del prospecto — ver
// src/config/oferta.ts, que la reemplaza con la propuesta de Prisma.
//
// Cruza dos fuentes DENTRO de cada archivo (tabla comparativa + tarjetas de
// detalle) por nombre de negocio normalizado, y reporta las que no casan.
//
// Uso:
//   node scripts/parse-prospect-analysis.mjs "<carpeta con los 4 HTML>" > supabase/test-data/07-load-prospect-analysis.sql
// ---------------------------------------------------------------

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";

const dir = process.argv[2];
if (!dir) {
  console.error("Uso: node scripts/parse-prospect-analysis.mjs <carpeta>");
  process.exit(1);
}

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

function alcaldiaFromTitle(h1) {
  const match = h1.match(/^Veterinarias en (.+), CDMX$/);
  return match ? match[1] : h1;
}

const files = readdirSync(dir).filter((f) => f.endsWith(".html"));
const allRecords = [];
const mismatches = [];

for (const file of files) {
  const html = readFileSync(join(dir, file), "utf-8");
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
  for (const key of allKeys) {
    const t = tableByName.get(key);
    const c = cardByName.get(key);
    if (!t || !c) {
      mismatches.push({
        file,
        businessName: (t ?? c).businessName,
        problem: !t ? "está en las tarjetas pero no en la tabla comparativa" : "está en la tabla pero no en las tarjetas de detalle",
      });
      continue;
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

if (mismatches.length > 0) {
  console.error(`\n⚠ ${mismatches.length} negocios no casaron entre tabla y tarjetas:`);
  for (const m of mismatches) {
    console.error(`  - [${m.file}] "${m.businessName}" ${m.problem}`);
  }
  console.error("");
}

console.error(`Total de registros a insertar: ${allRecords.length}`);
const capKeys = ["has_web", "has_whatsapp", "has_reservas", "has_crm", "has_chat", "has_blog", "has_redes"];
const summary = { is_urgent: 0 };
for (const key of capKeys) summary[key] = 0;
for (const r of allRecords) {
  if (r.is_urgent) summary.is_urgent += 1;
  for (const key of capKeys) if (r[key] === true) summary[key] += 1;
}
console.error(`Urgentes: ${summary.is_urgent}/${allRecords.length}`);
console.error("Capacidad presente (true) por columna:", JSON.stringify(summary));

// ---------------------------------------------------------------
// SQL de salida: el match contra contacts es por nombre de negocio EXACTO
// (mismo texto que se usó al importar el CSV a contacts.business_name),
// insensible a mayúsculas y a espacios sobrantes — no por acentos, porque
// el nombre en contacts viene del MISMO archivo fuente. owner_id y
// contact_id salen del contacto real vía este join: si un negocio no
// aparece en contacts (o el nombre no calza exacto), la fila se reporta
// al final para revisión manual — nunca se inserta con owner_id null,
// porque la columna es NOT NULL.
// ---------------------------------------------------------------

const rows = allRecords
  .map((r) => {
    return `  (${sqlString(r.business_name)}, ${sqlString(r.alcaldia)}, ${sqlString(r.colonia)}, ${sqlString(r.address)}, ${sqlString(r.phone)}, ${sqlString(r.email)}, ${sqlString(r.web_note)}, ${r.score ?? "null"}, ${sqlBool(r.is_urgent)}, ${sqlBool(r.has_web)}, ${sqlBool(r.has_whatsapp)}, ${sqlBool(r.has_reservas)}, ${sqlBool(r.has_crm)}, ${sqlBool(r.has_chat)}, ${sqlBool(r.has_blog)}, ${sqlBool(r.has_redes)}, ${sqlTextArray(r.gaps)}, ${sqlString(r.note)}, ${sqlString(r.source_file)})`;
  })
  .join(",\n");

console.log(`-- ---------------------------------------------------------------
-- Carga de prospect_analysis desde los 4 HTML de prospección (28 agosto).
-- Generado por scripts/parse-prospect-analysis.mjs — no editar a mano,
-- volver a correr el script si hay que corregir algo en el origen.
--
-- owner_id/contact_id salen de un LEFT JOIN por nombre exacto contra
-- contacts. Corre primero el SELECT de abajo para ver cuántos no casan
-- antes de insertar.
-- ---------------------------------------------------------------

-- 1) Verificación: negocios del HTML sin match en contacts (deberían ser 0)
select v.business_name
from (values
${rows}
) as v(business_name, alcaldia, colonia, address, phone, email, web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat, has_blog, has_redes, gaps, note, source_file)
left join contacts c on lower(trim(c.business_name)) = lower(trim(v.business_name))
where c.id is null;

-- 2) Carga real
insert into prospect_analysis (
  owner_id, contact_id, business_name, alcaldia, colonia, address, phone, email,
  web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat,
  has_blog, has_redes, gaps, note, source_file
)
select
  c.owner_id, c.id, v.business_name, v.alcaldia, v.colonia, v.address, v.phone, v.email,
  v.web_note, v.score, v.is_urgent, v.has_web, v.has_whatsapp, v.has_reservas, v.has_crm, v.has_chat,
  v.has_blog, v.has_redes, v.gaps, v.note, v.source_file
from (values
${rows}
) as v(business_name, alcaldia, colonia, address, phone, email, web_note, score, is_urgent, has_web, has_whatsapp, has_reservas, has_crm, has_chat, has_blog, has_redes, gaps, note, source_file)
join contacts c on lower(trim(c.business_name)) = lower(trim(v.business_name));
`);
