// ---------------------------------------------------------------
// Compara la aritmética de src/lib/quoteMath.ts (la réplica en cliente que
// usa el wizard de cotización para el preview instantáneo) contra
// compute_quote_totals() (Postgres, supabase/migrations/0024_compute_quote_totals.sql)
// — la función de SOLO CÁLCULO que generate_quote() también llama
// internamente, así que del lado servidor hay una sola aritmética. Ver
// CLAUDE.md, la nota sobre quoteMath.ts.
//
// Uso: npx tsx scripts/check-quote-math.ts
// Necesita NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (las
// mismas que check-catalog-sync.ts) — nada más. compute_quote_totals() no
// lee ni escribe ninguna tabla (parámetros de entrada, números de salida),
// así que no hace falta sesión, no inserta nada que limpiar después, y NO
// necesita — y no debe usar nunca — la service_role key: esa llave se
// salta todo RLS y no vive fuera del dashboard de Supabase.
//
// Tres desenlaces posibles, cada uno con su propio prefijo en el mensaje
// para que no se confundan nunca (son tres arreglos distintos):
//   [ARITMETICA]  el número no coincide -> bug real, hay que arreglar
//                 quoteMath.ts o compute_quote_totals()
//   [RED]         no se pudo hablar con Supabase -> problema de red o de
//                 disponibilidad, no del código
//   [ESQUEMA]     compute_quote_totals() no existe o cambió su firma ->
//                 falta correr la migración 0024, el código va adelante
//                 del esquema real
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  computeMrr,
  computePagoDiferidoMensual,
  computePagoInicial,
  computeSubtotal,
  computeTotal,
  type QuoteMathLine,
} from "../src/lib/quoteMath";

type Line = { itemType: "producto" | "adn" | "gestion"; itemId: string; quotedPrice: number };

type TestCase = {
  name: string;
  mode: "pkg" | "custom";
  packagePrice?: number;
  lines: Line[];
  mesesDiferimiento: number;
  precioEspecial?: number;
};

// Los 5 casos pedidos explícitamente — el 3 es la regresión real que ya se
// coló una vez (gestión sumándose al total de implementación). Los ids de
// producto/adn/gestión son solo etiquetas para el mensaje de error — la
// función de cálculo no valida contra el catálogo (eso lo hace
// generate_quote(), no esta), así que no necesitan existir de verdad.
const CASES: TestCase[] = [
  {
    name: "Paquete solo",
    mode: "pkg",
    packagePrice: 15000,
    lines: [],
    mesesDiferimiento: 12,
  },
  {
    name: "Paquete + productos",
    mode: "pkg",
    packagePrice: 27000,
    lines: [{ itemType: "producto", itemId: "producto-cotizaciones-invoices", quotedPrice: 2500 }],
    mesesDiferimiento: 12,
  },
  {
    name: "Paquete + ADN + gestión (regresión: gestión no debe sumar al total)",
    mode: "pkg",
    packagePrice: 15000,
    lines: [
      { itemType: "adn", itemId: "adn-completo", quotedPrice: 12000 },
      { itemType: "gestion", itemId: "gestion-plan-crecimiento", quotedPrice: 9000 },
    ],
    mesesDiferimiento: 6,
  },
  {
    name: "Precio de vendedora arriba y abajo del catálogo",
    mode: "custom",
    lines: [
      // Catálogo: $2,000 — la vendedora cotizó $2,500 (arriba).
      { itemType: "producto", itemId: "producto-email-marketing", quotedPrice: 2500 },
      // Catálogo: $1,500 — la vendedora cotizó $1,000 (abajo).
      { itemType: "producto", itemId: "producto-sms-marketing", quotedPrice: 1000 },
    ],
    mesesDiferimiento: 12,
  },
  {
    name: "Sin paquete, solo productos",
    mode: "custom",
    lines: [
      { itemType: "producto", itemId: "producto-bienvenida", quotedPrice: 1800 },
      { itemType: "producto", itemId: "producto-missed-call", quotedPrice: 1200 },
      { itemType: "producto", itemId: "producto-seguimiento-post-servicio", quotedPrice: 2000 },
    ],
    mesesDiferimiento: 12,
  },
];

function readEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
    const env: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1] as string] = (match[2] as string).trim();
    }
    return env;
  } catch {
    return {};
  }
}

// En Vercel, las variables ya están en process.env — .env.local es solo
// para correr esto en la laptop, igual que check-catalog-sync.ts.
function resolveEnv(name: string, envLocal: Record<string, string>): string | undefined {
  return process.env[name] ?? envLocal[name];
}

const NUMERIC_TOLERANCE = 0.01;

function numbersMatch(a: number, b: number): boolean {
  return Math.abs(a - b) < NUMERIC_TOLERANCE;
}

async function main() {
  const envLocal = readEnvLocal();
  const url = resolveEnv("NEXT_PUBLIC_SUPABASE_URL", envLocal);
  const anonKey = resolveEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", envLocal);

  if (!url || !anonKey) {
    console.error("[RED] Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — no se puede ni intentar conectar.");
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);

  let arithmeticFailures = 0;
  let schemaFailures = 0;
  let networkFailures = 0;
  let unexpectedFailures = 0;

  for (const testCase of CASES) {
    const mathLines: QuoteMathLine[] = testCase.lines.map((l) => ({ itemType: l.itemType, quotedPrice: l.quotedPrice }));
    const expectedSubtotal = computeSubtotal(testCase.mode, testCase.packagePrice ?? null, mathLines);
    const expectedTotal = computeTotal(expectedSubtotal, testCase.precioEspecial ?? null);
    const expectedPagoInicial = computePagoInicial(expectedTotal);
    const expectedPagoDiferido = computePagoDiferidoMensual(expectedTotal, expectedPagoInicial, testCase.mesesDiferimiento);
    const expectedMrr = computeMrr(mathLines);

    let rpcData: { subtotal: number; total: number; pago_inicial: number; pago_diferido_mensual: number; mrr: number }[] | null =
      null;
    let rpcError: { message: string; code?: string } | null = null;
    try {
      const { data, error } = await supabase.rpc("compute_quote_totals", {
        p_mode: testCase.mode,
        p_package_price: testCase.packagePrice ?? null,
        p_lines: testCase.lines.map((l) => ({ item_type: l.itemType, quoted_price: l.quotedPrice })),
        p_precio_especial: testCase.precioEspecial ?? null,
        p_meses_diferimiento: testCase.mesesDiferimiento,
      });
      rpcData = data;
      rpcError = error;
    } catch (e) {
      // fetch/red — supabase-js no siempre mete esto en `error`, a veces
      // truena directo (DNS, timeout, conexión rechazada).
      networkFailures++;
      console.error(`[RED] "${testCase.name}": no se pudo hablar con Supabase — ${(e as Error).message}`);
      continue;
    }

    if (rpcError) {
      const code = rpcError.code ?? "";
      const message = rpcError.message ?? "";
      const looksLikeMissingFunction =
        code === "PGRST202" || code === "42883" || /could not find the function|does not exist/i.test(message);
      const looksLikeNetwork = /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(message);

      if (looksLikeMissingFunction) {
        schemaFailures++;
        console.error(
          `[ESQUEMA] "${testCase.name}": compute_quote_totals() no existe o cambió su firma en la base — falta correr la migración 0024. (${message})`,
        );
      } else if (looksLikeNetwork) {
        networkFailures++;
        console.error(`[RED] "${testCase.name}": ${message}`);
      } else {
        unexpectedFailures++;
        console.error(`[ERROR INESPERADO] "${testCase.name}": compute_quote_totals() rechazó la llamada — ${message}`);
      }
      continue;
    }

    const row = rpcData?.[0];
    if (!row) {
      unexpectedFailures++;
      console.error(`[ERROR INESPERADO] "${testCase.name}": compute_quote_totals() no devolvió ninguna fila.`);
      continue;
    }

    const checks: [string, number, number][] = [
      ["subtotal", expectedSubtotal, Number(row.subtotal)],
      ["total", expectedTotal, Number(row.total)],
      ["pago_inicial", expectedPagoInicial, Number(row.pago_inicial)],
      ["pago_diferido_mensual", expectedPagoDiferido, Number(row.pago_diferido_mensual)],
      ["mrr", expectedMrr, Number(row.mrr)],
    ];

    let caseOk = true;
    for (const [field, expected, actual] of checks) {
      if (!numbersMatch(expected, actual)) {
        caseOk = false;
        console.error(
          `[ARITMETICA] "${testCase.name}" → ${field}: quoteMath.ts dice ${expected}, compute_quote_totals() dice ${actual}.`,
        );
      }
    }
    if (caseOk) {
      console.log(`OK — "${testCase.name}"`);
    } else {
      arithmeticFailures++;
    }
  }

  const totalFailures = arithmeticFailures + schemaFailures + networkFailures + unexpectedFailures;
  if (totalFailures === 0) {
    console.log(`\nOK — ${CASES.length} casos, quoteMath.ts coincide con compute_quote_totals().`);
    process.exit(0);
  }

  console.error(
    `\n${totalFailures} de ${CASES.length} casos fallaron — aritmética: ${arithmeticFailures}, esquema: ${schemaFailures}, red: ${networkFailures}, inesperado: ${unexpectedFailures}.`,
  );
  process.exit(1);
}

main();
