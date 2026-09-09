// ---------------------------------------------------------------
// Compara catalog_items (Postgres) contra src/config/pricing.ts (la fuente
// que se edita a mano) — ver CLAUDE.md, regla de pricing.ts.
//
// Ya NO lee catalog_items directo: desde 0031_restrict_public_policies.sql
// esa tabla ya no es legible por anon (era una fuga real — ver
// CONTRATO_BASE_COMPARTIDA.md, sección 3), y este script corre sin sesión
// (laptop, build de Vercel). En vez de eso llama a
// catalog_items_fingerprint() (0032_catalog_items_fingerprint.sql), que
// devuelve SOLO una huella sha256 del catálogo completo — nunca precios,
// nunca nombres. El script arma la misma huella desde pricing.ts y compara
// las dos cadenas.
//
// EL DETERMINISMO ES TODO EL DISEÑO — la especificación completa (orden,
// formato de número, separadores, algoritmo) vive citada dos veces, igual
// en los dos lados: aquí abajo y en el comentario de
// 0032_catalog_items_fingerprint.sql. Si un lado cambia, el otro cambia en
// el mismo commit — nunca "casualmente" coinciden hoy.
//
// Uso: npx tsx scripts/check-catalog-sync.ts
// Sin argumentos, sin variables de entorno que exportar a mano: en la
// laptop lee NEXT_PUBLIC_SUPABASE_URL/ANON_KEY de .env.local; en Vercel las
// toma de process.env — mismo patrón que check-quote-math.ts.
//
// Corre esto CADA VEZ que edites pricing.ts, después de regenerar la
// migración de seed con scripts/generate-catalog-seed.ts. Corre en
// .husky/pre-push y en "npm run build" — un desface bloquea el push y el
// deploy, no solo avisa.
//
// Tres categorías de salida, mismo criterio que
// .github/workflows/vercel-deploy-watch.yml — nunca el mismo mensaje
// opaco para "no coinciden" y "no pude preguntarle a la base":
//   [HASH]     las huellas no coinciden -> catalog_items y pricing.ts
//              están desincronizados de verdad. El mensaje trae los
//              pasos de recuperación (no dice CUÁL concepto cambió, la
//              huella no lo sabe).
//   [RED]      no se pudo llamar a catalog_items_fingerprint() (sin
//              conexión, HTTP fuera de 2xx) -> el candado está roto, no
//              es veredicto sobre el catálogo.
//   [ESQUEMA]  la función no existe o cambió de firma -> falta correr
//              0032_catalog_items_fingerprint.sql.
// ---------------------------------------------------------------

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  ADN_TIERS,
  GESTION_PLANS,
  PACKAGES,
  PLATFORM_CONSUMPTION_TIERS,
  PLATFORM_PLANS,
  PLATFORM_WHATSAPP_BRIDGE,
  PRODUCTS,
} from "../src/config/pricing";

type ExpectedRow = { itemType: string; itemId: string; price: number; includesWhatsapp: boolean };

const expected: ExpectedRow[] = [
  ...PACKAGES.map((p): ExpectedRow => ({ itemType: "paquete", itemId: p.id, price: p.price, includesWhatsapp: false })),
  ...ADN_TIERS.map((a): ExpectedRow => ({ itemType: "adn", itemId: a.id, price: a.price, includesWhatsapp: false })),
  ...PRODUCTS.map((p): ExpectedRow => ({ itemType: "producto", itemId: p.id, price: p.price, includesWhatsapp: false })),
  ...GESTION_PLANS.map((g): ExpectedRow => ({ itemType: "gestion", itemId: g.id, price: g.price, includesWhatsapp: false })),
  ...PLATFORM_PLANS.map((p): ExpectedRow => ({ itemType: "plataforma_plan", itemId: p.id, price: p.price, includesWhatsapp: p.includesWhatsapp })),
  ...PLATFORM_CONSUMPTION_TIERS.map((c): ExpectedRow => ({ itemType: "plataforma_consumo", itemId: c.id, price: c.price, includesWhatsapp: false })),
  { itemType: "plataforma_whatsapp", itemId: PLATFORM_WHATSAPP_BRIDGE.id, price: PLATFORM_WHATSAPP_BRIDGE.price, includesWhatsapp: false },
];

// ---------- especificación de la huella (ver también la migración 0032) ----------
// 1. Una fila de texto por concepto.
// 2. Orden: por itemId, ascendente, comparación SIMPLE de string — nunca
//    localeCompare (depende del locale del entorno donde corra Node, que
//    puede no coincidir con el collate "C" del lado Postgres para los
//    mismos 42 ids).
// 3. Cada fila: itemType + "|" + itemId + "|" + precio + "|" + whatsapp
//    - precio: price.toFixed(2) — siempre 2 decimales, punto decimal, sin
//      separador de miles. Espejo exacto de price::text sobre una columna
//      numeric(12,2) en Postgres.
//    - whatsapp: String(includesWhatsapp) -> "true"/"false" minúsculas.
// 4. Filas unidas con "\n" (un LF, sin CR, sin separador final).
// 5. sha256 sobre la cadena completa en UTF-8.
// 6. Hex, minúsculas, sin prefijo.
function computeExpectedFingerprint(rows: ExpectedRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    if (a.itemId < b.itemId) return -1;
    if (a.itemId > b.itemId) return 1;
    return 0;
  });
  const body = sorted
    .map((r) => `${r.itemType}|${r.itemId}|${r.price.toFixed(2)}|${String(r.includesWhatsapp)}`)
    .join("\n");
  return createHash("sha256").update(body, "utf8").digest("hex");
}

function readEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
    const env: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        env[match[1] as string] = (match[2] as string).trim();
      }
    }
    return env;
  } catch {
    return {};
  }
}

// En Vercel, las variables ya están en process.env — .env.local es solo
// para correr esto en la laptop, igual que check-quote-math.ts.
function resolveEnv(name: string, envLocal: Record<string, string>): string | undefined {
  return process.env[name] ?? envLocal[name];
}

async function main() {
  const envLocal = readEnvLocal();
  const url = resolveEnv("NEXT_PUBLIC_SUPABASE_URL", envLocal);
  const key = resolveEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", envLocal);
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (ni en process.env ni en .env.local)");
    process.exit(1);
  }

  const localFingerprint = computeExpectedFingerprint(expected);

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc("catalog_items_fingerprint");

  if (error) {
    // PostgREST/Postgres marcan "función no existe" con 42883 (undefined_function)
    // o, vía PostgREST, PGRST202 — cualquiera de los dos es [ESQUEMA], no [RED]:
    // el candado está desactualizado, no caído.
    const isMissingFunction = error.code === "42883" || error.code === "PGRST202";
    if (isMissingFunction) {
      console.error(
        `[ESQUEMA] catalog_items_fingerprint() no existe o cambió de firma en la base — falta correr la migración ` +
          `0032_catalog_items_fingerprint.sql. (${error.message})`,
      );
    } else {
      console.error(`[RED] No se pudo llamar a catalog_items_fingerprint(): ${error.message}. No es veredicto sobre el catálogo.`);
    }
    process.exit(1);
  }

  const remoteFingerprint = data as string | null;

  if (!remoteFingerprint || typeof remoteFingerprint !== "string" || !/^[0-9a-f]{64}$/.test(remoteFingerprint)) {
    console.error(
      `[ESQUEMA] catalog_items_fingerprint() devolvió algo que no es un sha256 hex de 64 caracteres (¿catalog_items vacía, o la función cambió?): ${JSON.stringify(remoteFingerprint)}`,
    );
    process.exit(1);
  }

  if (remoteFingerprint !== localFingerprint) {
    console.error(
      `[HASH] catalog_items (base) y pricing.ts (${expected.length} conceptos) NO coinciden.\n` +
        `  huella esperada (pricing.ts):   ${localFingerprint}\n` +
        `  huella real (catalog_items):    ${remoteFingerprint}\n\n` +
        `La huella no dice cuál concepto cambió — así se diseñó (ver 0032_catalog_items_fingerprint.sql). Para encontrarlo:\n` +
        `  1. Abre Supabase Studio con sesión (el SQL Editor), y compara \`select * from catalog_items order by item_id\`\n` +
        `     contra src/config/pricing.ts, concepto por concepto.\n` +
        `  2. Si la diferencia es que pricing.ts cambió y catalog_items no se actualizó: corre\n` +
        `     \`npx tsx scripts/generate-catalog-seed.ts\` y aplica la migración de seed que genera.\n` +
        `  3. Si es al revés (alguien editó catalog_items directo con UPDATE/INSERT, algo que CLAUDE.md prohíbe):\n` +
        `     corrige pricing.ts para que sea la fuente real, o revierte el cambio directo en la base.\n` +
        `  4. Vuelve a correr este script — debe salir "OK" antes de hacer push.`,
    );
    process.exit(1);
  }

  console.log(`OK — catalog_items coincide con pricing.ts (${expected.length} conceptos, huella ${remoteFingerprint.slice(0, 12)}…).`);
}

main();
