// ---------------------------------------------------------------
// Genera las filas de seed de app_settings para los links de pago de
// Stripe, a partir de src/config/pricing.ts vía src/config/appSettings.ts
// — nunca se transcribe la clave a mano (ver CLAUDE.md, regla de
// pricing.ts, y el comentario de appSettings.ts).
//
// Uso: npx tsx scripts/generate-app-settings-seed.ts
// Pega la salida dentro del INSERT de seed de la migración correspondiente
// (junto a las filas bank_*, que sí se escriben a mano — no salen de
// ningún catálogo).
// ---------------------------------------------------------------

import { STRIPE_LINK_KEYS } from "../src/config/appSettings";

function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

console.log(
  `-- Generado por scripts/generate-app-settings-seed.ts a partir de PACKAGES (src/config/pricing.ts) — ${STRIPE_LINK_KEYS.length} claves. No editar a mano.`,
);
console.log(
  STRIPE_LINK_KEYS.map((key) => `  (${sqlString(key)}, null)`).join(",\n") + ";",
);
