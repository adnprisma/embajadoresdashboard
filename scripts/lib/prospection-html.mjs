// ---------------------------------------------------------------
// Extracción de HTML de prospección — compartida entre
// report-prospection-lot.mjs (Fase A) y load-prospection-lot.mjs (carga
// real). Vive aparte para que los dos scripts parseen el HTML EXACTAMENTE
// igual: dos implementaciones del mismo parseo divergen tarde o temprano.
//
// Reemplaza el parseo que vivía dentro de parse-prospect-analysis.mjs —
// ese script se queda como está (sigue sirviendo para re-analizar un
// contacto que ya existe, sin crear nada nuevo), pero el flujo nuevo de
// carga (contacto + análisis en una sola pasada) usa este módulo.
// ---------------------------------------------------------------

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";

export function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[—–]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function iconState($cell) {
  if ($cell.find(".check").length) return true;
  if ($cell.find(".partial").length) return null; // presencia parcial (ej. web en subdominio gratuito) — ni true ni false
  return false;
}

// ---------- giro: mapa explícito, nunca se adivina ----------
// El H1 trae el giro en plural ("Dentistas en X, CDMX", "Veterinarias en
// X, CDMX"). Nada de regla automática de singularización — mismo criterio
// que GIRO_A_FRASE (src/config/mensajeContacto.ts) y OFERTA_POR_GIRO
// (src/config/oferta.ts): un giro nuevo se agrega aquí a mano. Si el H1
// trae un plural que no está aquí, resolveGiroYAlcaldia() lanza — nunca
// cae a un giro por default ni intenta adivinar la forma singular.
export const GIRO_PLURAL_A_SINGULAR = {
  Dentistas: "Dentista",
  Veterinarias: "Veterinaria",
};

// ---------- alcaldía: lista cerrada de las 16 de CDMX ----------
// Los HTML no siempre traen el nombre corto: los de veterinarias usan el
// nombre OFICIAL completo ("Cuajimalpa de Morelos", "La Magdalena
// Contreras"), los de dentistas la forma corta que ya coincide con la
// etiqueta. En vez de reinventar esa normalización cada vez (y volver a
// fallar como pasó con el JOIN por igualdad exacta — ver CLAUDE.md),
// aquí se resuelve UNA vez a la etiqueta corta canónica, comparando contra
// esta lista cerrada: CDMX tiene exactamente 16 alcaldías, no cambia.
export const ALCALDIA_TAGS = [
  "alvaroobregon",
  "azcapotzalco",
  "benitojuarez",
  "coyoacan",
  "cuajimalpa",
  "cuauhtemoc",
  "gustavoamadero",
  "iztacalco",
  "iztapalapa",
  "magdalenacontreras",
  "miguelhidalgo",
  "milpaalta",
  "tlahuac",
  "tlalpan",
  "venustianocarranza",
  "xochimilco",
];

function normalizeAlcaldiaText(text) {
  return text
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const H1_PATTERN = /^(\S+) en (.+), CDMX$/;

/**
 * Resuelve giro (singular) y etiqueta de alcaldía (corta, de ALCALDIA_TAGS)
 * a partir del H1. Lanza si el H1 no tiene la forma esperada, si el giro
 * (primera palabra) no está en GIRO_PLURAL_A_SINGULAR, o si el texto de
 * alcaldía no contiene ninguna de las 16 etiquetas conocidas — en los tres
 * casos, el mensaje dice exactamente qué falta agregar. Nunca adivina.
 */
export function resolveGiroYAlcaldia(h1Text, filePath) {
  const match = h1Text.match(H1_PATTERN);
  if (!match) {
    throw new Error(
      `${filePath}: el H1 "${h1Text}" no tiene la forma esperada "<Giro plural> en <Alcaldía>, CDMX".`,
    );
  }
  const [, giroPlural, alcaldiaTexto] = match;

  const giro = GIRO_PLURAL_A_SINGULAR[giroPlural];
  if (!giro) {
    throw new Error(
      `${filePath}: giro "${giroPlural}" no está en GIRO_PLURAL_A_SINGULAR (scripts/lib/prospection-html.mjs). ` +
        `Agrégalo a mano antes de cargar — nunca se adivina un giro nuevo.`,
    );
  }

  const normalizado = normalizeAlcaldiaText(alcaldiaTexto);
  const alcaldiaTag = ALCALDIA_TAGS.find((tag) => normalizado.includes(tag));
  if (!alcaldiaTag) {
    throw new Error(
      `${filePath}: el texto de alcaldía "${alcaldiaTexto}" (H1) no contiene ninguna de las 16 etiquetas conocidas ` +
        `(ver ALCALDIA_TAGS en scripts/lib/prospection-html.mjs). Revisa el H1 — CDMX no tiene una 17ª alcaldía.`,
    );
  }

  return { giro, alcaldiaTag, alcaldiaTexto };
}

export function expandToHtmlFiles(inputPaths) {
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
  return htmlFiles;
}

/**
 * Parsea todos los HTML dados. Primero valida giro+alcaldía de CADA
 * archivo (reporta TODOS los que fallen de una vez, no uno por uno) y
 * lanza sin extraer una sola ficha si algo no resuelve — no tiene sentido
 * extraer fichas de un archivo cuyo giro no se puede determinar.
 *
 * Devuelve { records, mismatches, totalCardsFound }. Cada record trae
 * giro y alcaldiaTag ya resueltos, listos para usarse como tags/industry
 * sin volver a tocar el H1.
 */
export function parseHtmlFiles(htmlFiles) {
  const parsed = new Map(); // filePath -> { $, giro, alcaldiaTag }
  const errors = [];

  for (const filePath of htmlFiles) {
    const html = readFileSync(filePath, "utf-8");
    const $ = cheerio.load(html);
    const h1 = $("h1").first().text().trim();
    try {
      const { giro, alcaldiaTag } = resolveGiroYAlcaldia(h1, filePath);
      parsed.set(filePath, { $, giro, alcaldiaTag });
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `${errors.length} archivo(s) con giro/alcaldía sin resolver — no se extrajo ninguna ficha:\n` +
        errors.map((m) => `  - ${m}`).join("\n"),
    );
  }

  const allRecords = [];
  const mismatches = [];
  let totalCardsFound = 0;

  for (const filePath of htmlFiles) {
    const file = filePath.split("/").pop();
    const { $, giro, alcaldiaTag } = parsed.get(filePath);

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

      // Algunos negocios traen más de una línea telefónica separada por
      // "/" ("55 5662 5756 / 55 5662 1006 / 55 5663 4365" — negocio real
      // con 3 líneas, no un error de dato: encontrado en el lote de
      // dentistas, "Genovés y Asociados"). Sin separar esto, el número
      // "normalizado" concatena las tres líneas en una cadena de 30
      // dígitos que no es ni válida ni el error que parece — se toma solo
      // la primera línea como teléfono principal (coincide con lo que la
      // propia tarjeta de mensaje sugerido usa como "Tel:") y las demás se
      // preservan en extraPhones, sin perderlas ni fingir que no existen.
      const telefonoRaw = contactLines["teléfono"] ?? null;
      const telefonos = telefonoRaw ? telefonoRaw.split("/").map((t) => t.trim()).filter(Boolean) : [];

      cardByName.set(key, {
        businessName,
        address: contactLines["dirección"] ?? null,
        phone: telefonos[0] ?? null,
        extraPhones: telefonos.slice(1),
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
      // Líneas telefónicas adicionales (ver arriba) se conservan en la
      // nota — perderlas silenciosamente sería el mismo tipo de omisión
      // que Molinos/Virtuodent, solo que de un dato en vez de un negocio
      // entero.
      const note =
        c.extraPhones.length > 0
          ? [c.note, `Líneas adicionales: ${c.extraPhones.join(", ")}`].filter(Boolean).join(" — ")
          : c.note;

      allRecords.push({
        business_name: t.businessName,
        giro,
        alcaldiaTag,
        colonia: t.colonia,
        address: c.address,
        phone: c.phone,
        extraPhones: c.extraPhones,
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
        note,
        source_file: file,
      });
    }
  }

  return { records: allRecords, mismatches, totalCardsFound };
}
