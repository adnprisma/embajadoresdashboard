// ---------------------------------------------------------------
// Fase A automatizada — reporte de un lote de prospección ANTES de
// cargarlo. Reemplaza el análisis ad hoc en Python que se corrió a mano
// para el lote de dentistas del 7 de septiembre de 2026: mismo algoritmo
// (scripts/lib/lot-analysis.mjs), ahora reutilizable para el siguiente
// nicho sin reconstruirlo.
//
// No escribe nada en la base ni genera SQL. Su única salida es:
//   1) un reporte legible en la terminal (conteos, alcaldías, clusters,
//      teléfonos mal formados, candidatos de marca sin confirmar), y
//   2) una PLANTILLA de decisiones (--out, default decisiones.json) con
//      cada cluster/teléfono mal formado listado y un campo `decision`
//      en null — a llenar a mano.
//
// load-prospection-lot.mjs (la carga real) EXIGE ese archivo de
// decisiones completo, sin ningún `decision: null` pendiente — así el
// juicio de negocio de Fase A no queda como un paso que alguien tenga que
// acordarse de hacer por su cuenta: sin decisiones, no hay carga.
//
// Uso:
//   node scripts/report-prospection-lot.mjs <carpeta-html> [--out <archivo.json>]
// ---------------------------------------------------------------

import { writeFileSync } from "node:fs";
import { expandToHtmlFiles, parseHtmlFiles } from "./lib/prospection-html.mjs";
import { findMalformedPhones, findNameClusters, findPhoneClusters, suggestBrandCandidates } from "./lib/lot-analysis.mjs";

const argv = process.argv.slice(2);
let outPath = "decisiones.json";
const inputPaths = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--out") {
    outPath = argv[++i];
  } else {
    inputPaths.push(argv[i]);
  }
}

if (inputPaths.length === 0) {
  console.error("Uso: node scripts/report-prospection-lot.mjs <carpeta-html> [--out <archivo.json>]");
  process.exit(1);
}

const htmlFiles = expandToHtmlFiles(inputPaths);

let records, mismatches, totalCardsFound;
try {
  ({ records, mismatches, totalCardsFound } = parseHtmlFiles(htmlFiles));
} catch (err) {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
}

const giro = records[0]?.giro ?? null;
console.error(`Giro: ${giro ?? "(sin fichas)"}`);
console.error(`Fichas encontradas (tabla ∪ tarjetas): ${totalCardsFound}`);
console.error(`Fichas completas (en ambas fuentes): ${records.length}`);
if (mismatches.length > 0) {
  console.error(`⚠ ${mismatches.length} mismatch(es) tabla/tarjeta — no cuentan como fichas completas:`);
  for (const m of mismatches) console.error(`  - [${m.file}] "${m.businessName}" ${m.problem}`);
}

const porAlcaldia = new Map();
for (const r of records) {
  porAlcaldia.set(r.alcaldiaTag, (porAlcaldia.get(r.alcaldiaTag) ?? 0) + 1);
}
console.error(`\nDesglose por alcaldía (${porAlcaldia.size}):`);
for (const [tag, count] of [...porAlcaldia.entries()].sort()) {
  console.error(`  ${tag}: ${count}`);
}

const conTelefono = records.filter((r) => r.phone).length;
console.error(`\nCon teléfono: ${conTelefono} / Sin teléfono: ${records.length - conTelefono}`);

const phoneClusters = findPhoneClusters(records);
console.error(`\n=== Teléfonos compartidos (misma línea, ${phoneClusters.length} grupo(s)) ===`);
for (const group of phoneClusters) {
  console.error(`  ${group[0].phone} (${group.length} negocios):`);
  for (const r of group) console.error(`    - ${r.business_name} [${r.alcaldiaTag}]`);
}

const nameClusters = findNameClusters(records);
console.error(`\n=== Nombres/doctores repetidos (posible misma marca, ${nameClusters.length} cluster(s)) ===`);
for (const group of nameClusters) {
  console.error(`  cluster (${group.length}):`);
  for (const r of group) console.error(`    - ${r.business_name} [${r.alcaldiaTag}] tel=${r.phone ?? "(sin)"}`);
}

const conLineasAdicionales = records.filter((r) => r.extraPhones?.length > 0);
if (conLineasAdicionales.length > 0) {
  console.error(
    `\n=== Negocios con más de una línea telefónica (${conLineasAdicionales.length}) — informativo, no es un teléfono mal formado ===`,
  );
  console.error(`Se toma la primera línea como principal; las demás quedan guardadas en la nota del análisis.`);
  for (const r of conLineasAdicionales) {
    console.error(`  - ${r.business_name} [${r.alcaldiaTag}] principal=${r.phone}, adicionales=${r.extraPhones.join(", ")}`);
  }
}

const malformed = findMalformedPhones(records);
console.error(`\n=== Teléfonos posiblemente mal formados (${malformed.length}) ===`);
for (const { record, digits, issue } of malformed) {
  console.error(`  - ${record.business_name} [${record.alcaldiaTag}] "${record.phone}" (normaliza a ${digits}): ${issue}`);
}

const brandCandidates = suggestBrandCandidates(records);
if (brandCandidates.length > 0) {
  console.error(
    `\n=== Candidatos de marca por primer token (${brandCandidates.length}) — SOLO sugerencias, revisar a mano ===`,
  );
  console.error(
    `No entran al archivo de decisiones automáticamente. Si alguno es una cadena real que findNameClusters()\n` +
      `no agrupó completa (pasó con Dentalia, La Clínica Dental y Dentis+a en el lote de dentistas — nombre+\n` +
      `ubicación pegados sin paréntesis, o variantes de ortografía), agrégalo a mano al archivo de decisiones.`,
  );
  for (const [token, group] of brandCandidates) {
    console.error(`  "${token}" (${group.length}): ${group.map((r) => `${r.business_name} [${r.alcaldiaTag}]`).join(", ")}`);
  }
}

// ---------- plantilla de decisiones ----------
const decisiones = {
  giro,
  sharedPhoneTag: "linea-compartida",
  chainTag: "misma-marca",
  loteTagConTelefono: null, // ej. "lote-dent-sep-2026" — a definir a mano, siguiendo la convención existente
  phoneClusters: phoneClusters.map((group) => ({
    phone: group[0].phone,
    negocios: group.map((r) => ({ business_name: r.business_name, alcaldiaTag: r.alcaldiaTag })),
  })),
  nameClusters: nameClusters.map((group) => ({
    negocios: group.map((r) => ({ business_name: r.business_name, alcaldiaTag: r.alcaldiaTag })),
    decision: null, // "misma-marca" | "no-es-duplicado" (nombre genérico / coincidencia)
  })),
  malformedPhones: malformed.map(({ record, digits, issue }) => ({
    business_name: record.business_name,
    alcaldiaTag: record.alcaldiaTag,
    phone: record.phone,
    digits,
    issue,
    decision: null, // "telefono-revisar" (cargar igual, con etiqueta) | "sin-telefono-valido" (tratar como si no tuviera teléfono) | "ya-cubierto-por-otra-etiqueta" (cargar tal cual, sin etiqueta extra — ej. una línea nacional que ya lleva linea-compartida/misma-marca)
  })),
};

writeFileSync(outPath, JSON.stringify(decisiones, null, 2) + "\n");
console.error(
  `\n— plantilla de decisiones escrita en ${outPath} — llena cada "decision": null y "loteTagConTelefono" ` +
    `antes de correr load-prospection-lot.mjs. —`,
);
