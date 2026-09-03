// ---------------------------------------------------------------
// Genera el SQL de seed de `catalog_items` a partir de src/config/pricing.ts
// — nunca se transcribe a mano (ver CLAUDE.md, regla de pricing.ts).
//
// Uso: npx tsx scripts/generate-catalog-seed.ts
// Pega la salida dentro de la sección de seed de la migración
// correspondiente (reemplazando el bloque `insert into catalog_items ...`
// completo — no a mano, línea por línea).
// ---------------------------------------------------------------

import {
  ADN_TIERS,
  GESTION_PLANS,
  PACKAGES,
  PLATFORM_CONSUMPTION_TIERS,
  PLATFORM_PLANS,
  PLATFORM_WHATSAPP_BRIDGE,
  PRODUCTS,
} from "../src/config/pricing";

type Row = {
  itemType: string;
  itemId: string;
  name: string;
  price: number;
  currency: "MXN" | "USD";
  includesWhatsapp: boolean;
};

const rows: Row[] = [
  ...PACKAGES.map((p): Row => ({ itemType: "paquete", itemId: p.id, name: p.name, price: p.price, currency: "MXN", includesWhatsapp: false })),
  ...ADN_TIERS.map((a): Row => ({ itemType: "adn", itemId: a.id, name: a.name, price: a.price, currency: "MXN", includesWhatsapp: false })),
  ...PRODUCTS.map((p): Row => ({ itemType: "producto", itemId: p.id, name: p.name, price: p.price, currency: "MXN", includesWhatsapp: false })),
  ...GESTION_PLANS.map((g): Row => ({ itemType: "gestion", itemId: g.id, name: g.name, price: g.price, currency: "MXN", includesWhatsapp: false })),
  ...PLATFORM_PLANS.map((p): Row => ({ itemType: "plataforma_plan", itemId: p.id, name: p.name, price: p.price, currency: "USD", includesWhatsapp: p.includesWhatsapp })),
  ...PLATFORM_CONSUMPTION_TIERS.map((c): Row => ({ itemType: "plataforma_consumo", itemId: c.id, name: c.name, price: c.price, currency: "USD", includesWhatsapp: false })),
  { itemType: "plataforma_whatsapp", itemId: PLATFORM_WHATSAPP_BRIDGE.id, name: PLATFORM_WHATSAPP_BRIDGE.name, price: PLATFORM_WHATSAPP_BRIDGE.price, currency: "USD", includesWhatsapp: false },
];

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

console.log(`-- Generado por scripts/generate-catalog-seed.ts a partir de src/config/pricing.ts — ${rows.length} filas. No editar a mano.`);
console.log("insert into catalog_items (item_type, item_id, name, price, currency, includes_whatsapp) values");
console.log(
  rows
    .map(
      (row, i) =>
        `  (${sqlString(row.itemType)}, ${sqlString(row.itemId)}, ${sqlString(row.name)}, ${row.price}, ${sqlString(row.currency)}, ${row.includesWhatsapp})${i === rows.length - 1 ? ";" : ","}`,
    )
    .join("\n"),
);
