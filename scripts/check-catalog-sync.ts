// ---------------------------------------------------------------
// Compara catalog_items (Postgres) contra src/config/pricing.ts (la fuente
// que se edita a mano) — ver CLAUDE.md, regla de pricing.ts.
//
// Uso: npx tsx scripts/check-catalog-sync.ts
// Sin argumentos, sin variables de entorno que exportar a mano: lee
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY directo de .env.local.
//
// Corre esto CADA VEZ que edites pricing.ts, después de regenerar la
// migración de seed con scripts/generate-catalog-seed.ts. No es parte de
// ningún pipeline automático — es responsabilidad de quien toca el
// catálogo correrlo antes de hacer push.
// ---------------------------------------------------------------

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

function readEnvLocal() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      env[match[1] as string] = (match[2] as string).trim();
    }
  }
  return env;
}

async function main() {
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("catalog_items")
    .select("item_type, item_id, price, includes_whatsapp");

  if (error) {
    console.error("No se pudo leer catalog_items:", error.message);
    process.exit(1);
  }

  const actual = new Map(data.map((row) => [`${row.item_type}:${row.item_id}`, row]));
  const expectedKeys = new Set(expected.map((row) => `${row.itemType}:${row.itemId}`));

  let ok = true;

  for (const row of expected) {
    const key = `${row.itemType}:${row.itemId}`;
    const found = actual.get(key);
    if (!found) {
      ok = false;
      console.error(`FALTA en catalog_items: ${key} (pricing.ts dice $${row.price})`);
      continue;
    }
    if (Number(found.price) !== row.price) {
      ok = false;
      console.error(`PRECIO DISTINTO en ${key}: catalog_items=$${found.price}, pricing.ts=$${row.price}`);
    }
    if (Boolean(found.includes_whatsapp) !== row.includesWhatsapp) {
      ok = false;
      console.error(`includes_whatsapp DISTINTO en ${key}: catalog_items=${found.includes_whatsapp}, pricing.ts=${row.includesWhatsapp}`);
    }
  }

  for (const key of actual.keys()) {
    if (!expectedKeys.has(key)) {
      ok = false;
      console.error(`SOBRA en catalog_items (ya no existe en pricing.ts): ${key}`);
    }
  }

  if (ok) {
    console.log(`OK — catalog_items coincide con pricing.ts (${expected.length} conceptos).`);
  } else {
    console.error("\ncatalog_items y pricing.ts están desincronizados — ver arriba.");
    process.exit(1);
  }
}

main();
