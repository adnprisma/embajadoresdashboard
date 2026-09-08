// ---------------------------------------------------------------
// Análisis de Fase A reutilizable — mismo algoritmo que se corrió a mano
// (Python, fuera del repo) para el lote de dentistas del 7 de septiembre
// de 2026, ahora como código permanente para que el siguiente nicho no
// dependa de reconstruirlo ad hoc cada vez.
//
// Esto NO decide nada por su cuenta — solo encuentra candidatos
// (teléfonos compartidos, nombres/doctores repetidos, teléfonos mal
// formados) para que un humano los revise en report-prospection-lot.mjs y
// escriba las decisiones (ver ese script). El juicio de negocio (¿es
// cadena real o coincidencia de nombre genérico? ¿se carga con etiqueta o
// se descarta?) sigue siendo de quien revisa el reporte, no de este
// módulo.
// ---------------------------------------------------------------

import { normalize } from "./prospection-html.mjs";

export function normalizePhone(phone) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && (digits.startsWith("52") || digits.startsWith("521"))) {
    digits = digits.startsWith("521") ? digits.slice(3) : digits.slice(2);
  }
  return digits.length > 0 ? digits : null;
}

// Ladas de CDMX observadas en los lotes cargados hasta hoy. Si un lote
// nuevo trae una lada válida que no está aquí, se agrega a mano — esta
// lista NO pretende ser exhaustiva de México, solo de lo que ya se vio.
const VALID_CDMX_LADA_PREFIXES = ["55", "56"];

/** Candidatos a teléfono mal formado: longitud rara, lada fuera de CDMX, o línea nacional (800). */
export function findMalformedPhones(records) {
  const issues = [];
  for (const r of records) {
    const digits = normalizePhone(r.phone);
    if (!digits) continue;
    if (digits.length !== 10) {
      issues.push({ record: r, digits, issue: `normaliza a ${digits.length} dígitos, se esperaban 10 (revisar prefijo, ej. "01" de larga distancia vieja)` });
    } else if (digits.startsWith("80")) {
      issues.push({ record: r, digits, issue: `empieza en "80" — probable línea nacional (800...), no de sucursal` });
    } else if (!VALID_CDMX_LADA_PREFIXES.includes(digits.slice(0, 2))) {
      issues.push({ record: r, digits, issue: `lada "${digits.slice(0, 2)}" no está en las ladas de CDMX conocidas (${VALID_CDMX_LADA_PREFIXES.join("/")}) — revisar si es válida o agregarla a VALID_CDMX_LADA_PREFIXES` });
    }
  }
  return issues;
}

/** Grupos de 2+ registros con el mismo teléfono normalizado — misma línea física. */
export function findPhoneClusters(records) {
  const byPhone = new Map();
  for (const r of records) {
    const p = normalizePhone(r.phone);
    if (!p) continue;
    if (!byPhone.has(p)) byPhone.set(p, []);
    byPhone.get(p).push(r);
  }
  return [...byPhone.values()].filter((group) => group.length > 1);
}

function baseName(name) {
  return normalize(name.split(/[\(—–]/)[0]);
}

// Requiere nombre + 3 a 5 palabras más, para no capturar solo un primer
// nombre común (ver nota de "maria" como falso positivo, lote de
// dentistas 2026-09-07: cuatro doctoras distintas, todas "María [algo]",
// que un patrón más corto habría fundido en un solo cluster falso).
function doctorName(name) {
  const m = name.match(/(?:Dr\.?|Dra\.?)\s+([A-ZÁÉÍÓÚÑ][\wÀ-ÿ.]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÀ-ÿ.]*){2,4})/);
  return m ? normalize(m[1]) : null;
}

// Nombres puramente descriptivos que NO son evidencia de duplicado por sí
// solos (ej. "Consultorio Dental" = "Dental Office"). Es específico del
// giro — lo que es genérico para dentistas puede no serlo para el
// siguiente nicho; revisar/ampliar por lote, no asumir que esta lista
// sirve para cualquier giro.
export const GENERIC_BASE_NAMES = new Set(["consultorio dental", "clinica dental", "dental clinic", "odontologia integral"]);

/**
 * Clusters de 2+ registros que repiten nombre (antes del primer
 * paréntesis/guion) o nombre de doctor/a — candidatos a "misma marca,
 * sucursales distintas". Excluye nombres en GENERIC_BASE_NAMES.
 *
 * Limitación conocida, no resuelta aquí a propósito: una cadena real cuyo
 * nombre va pegado a la ubicación SIN paréntesis ("Dentalia Clavería") o
 * con variantes de ortografía ("Dentis+a" / "Dentisxa") no se agrupa por
 * este método — se encontró así en el lote de dentistas (Dentalia
 * apareció con 6 de sus 10 sucursales, La Clínica Dental con 7 de 10,
 * Dentis+a con 4 de 6). Ver findBrandHintClusters() para cerrar ese hueco
 * a partir de que un humano confirme el nombre de marca.
 */
export function findNameClusters(records) {
  const n = records.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  const byBase = new Map();
  const byDoctor = new Map();
  records.forEach((r, i) => {
    const b = baseName(r.business_name);
    if (!GENERIC_BASE_NAMES.has(b)) {
      if (!byBase.has(b)) byBase.set(b, []);
      byBase.get(b).push(i);
    }
    const d = doctorName(r.business_name);
    if (d) {
      if (!byDoctor.has(d)) byDoctor.set(d, []);
      byDoctor.get(d).push(i);
    }
  });
  for (const group of [...byBase.values(), ...byDoctor.values()]) {
    for (let j = 1; j < group.length; j++) union(group[0], group[j]);
  }

  const clusters = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(i);
  }
  return [...clusters.values()]
    .filter((idxs) => idxs.length > 1)
    .map((idxs) => idxs.map((i) => records[i]));
}

// Palabras conectoras genéricas que arruinan un agrupamiento por primer
// token si no se excluyen (ej. "Consultorio Dr. X" y "Consultorio Dr. Y"
// son negocios distintos, no la misma marca "Consultorio").
const GENERIC_FIRST_WORDS = new Set([
  "consultorio", "consultorios", "clinica", "clinicas", "centro", "dr", "dra", "grupo",
  "odontologia", "especialidades", "cosmetica", "dentista", "implantes", "el", "la", "los",
  "cd", "david", "dental", "smile", "sonrisas", "endodoncia", "odontologo", "smart",
  "innova", "ortodoncia",
]);

/**
 * Agrupa por primer palabra del nombre (normalizada), excluyendo
 * conectores genéricos — son CANDIDATOS a revisar a mano, no clusters
 * confirmados como findNameClusters(). Sirve para que report-prospection-
 * lot.mjs muestre "esto podría ser una marca que el cruce por paréntesis
 * no agrupó completa" (fue así como se encontraron las 4 sucursales de
 * Dentalia y las 3 de La Clínica Dental que el método normal no cazó en
 * el lote de dentistas) — el humano decide si de verdad es la misma marca
 * y lo agrega a mano al archivo de decisiones.
 */
export function suggestBrandCandidates(records, minWordLength = 3) {
  const groups = new Map();
  for (const r of records) {
    const words = normalize(r.business_name).split(" ");
    const first = words[0] ?? "";
    if (first.length < minWordLength || GENERIC_FIRST_WORDS.has(first)) continue;
    if (!groups.has(first)) groups.set(first, []);
    groups.get(first).push(r);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}
