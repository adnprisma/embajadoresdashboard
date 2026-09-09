// ---------------------------------------------------------------
// Confirma que ninguna tabla de public quedó abierta a anon — ni por una
// política PERMISSIVE con rol public (el caso real de catalog_items, ver
// CONTRATO_BASE_COMPARTIDA.md sección 3), ni por RLS sin activar del todo
// (el caso que un chequeo que solo mirara pg_policies no vería).
//
// Llama a audit_public_role_policies() (0034_audit_public_role_policies.sql)
// sin sesión, con la anon key — mismo patrón que check-catalog-sync.ts y
// check-quote-math.ts. La función devuelve SOLO un conteo (bigint), para
// cualquier caller, sin excepción — no hay versión con detalle para nadie.
// Se evaluó dar detalle (tabla/política/motivo) a un caller 'authenticated'
// y se descartó: esa rama era inalcanzable en la práctica (el SQL Editor de
// Supabase no lleva JWT, así que ahí también se ve el conteo; este script
// corre siempre sin sesión; no hay pantalla del dashboard que llame esta
// RPC) — solo habría concedido información por una puerta que nadie usa,
// y que un atacante podría usar igual.
//
// El detalle real — cuál tabla, cuál política — se obtiene con las dos
// consultas directas contra pg_policies/pg_class de más abajo, a mano, en
// el SQL Editor (que ya tiene BYPASSRLS: no necesita esta función).
//
// Uso: npx tsx scripts/check-no-public-exposure.ts
// Corre en .husky/pre-push y en "npm run build" — mismo criterio que los
// otros dos candados.
//
// Tres categorías de salida, mismo criterio que vercel-deploy-watch.yml,
// check-catalog-sync.ts y check-quote-math.ts:
//   [POLITICA] el conteo es mayor a 0 -> hay algo expuesto de verdad.
//   [RED]      no se pudo llamar a la función (sin conexión, HTTP fuera de
//              2xx) -> el candado está roto, no es veredicto sobre el
//              esquema.
//   [ESQUEMA]  la función no existe o cambió de firma -> falta correr
//              0034_audit_public_role_policies.sql.
// ---------------------------------------------------------------

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

  const supabase = createClient(url, key);
  const { data, error } = await supabase.rpc("audit_public_role_policies");

  if (error) {
    const isMissingFunction = error.code === "42883" || error.code === "PGRST202";
    if (isMissingFunction) {
      console.error(
        `[ESQUEMA] audit_public_role_policies() no existe o cambió de firma en la base — falta correr ` +
          `0034_audit_public_role_policies.sql. (${error.message})`,
      );
    } else {
      console.error(
        `[RED] No se pudo llamar a audit_public_role_policies(): ${error.message}. No es veredicto sobre el esquema.`,
      );
    }
    process.exit(1);
  }

  // audit_public_role_policies() devuelve un bigint escalar, no una tabla —
  // PostgREST lo entrega directo en `data` (a veces como string, para no
  // perder precisión fuera del rango seguro de un number de JS).
  const count = typeof data === "string" ? Number(data) : (data as number | null);

  if (count === null || count === undefined || Number.isNaN(count)) {
    console.error(
      `[ESQUEMA] audit_public_role_policies() no devolvió un número — se esperaba un bigint, incluso en el caso limpio (0). Valor recibido: ${JSON.stringify(data)}`,
    );
    process.exit(1);
  }

  if (count > 0) {
    console.error(
      `[POLITICA] Hay ${count} tabla(s)/política(s) de public expuestas a anon fuera de lo esperado.\n\n` +
        `Este script corre como anon a propósito, así que solo ve el conteo — no cuáles. Para ver cuáles, en el SQL ` +
        `Editor de Supabase (BYPASSRLS ya te da acceso directo, no hace falta la función):\n\n` +
        `  select tablename, policyname, roles, permissive, cmd\n` +
        `  from pg_policies\n` +
        `  where schemaname = 'public' and 'public' = any(roles)\n` +
        `    and not (permissive = 'RESTRICTIVE' and policyname = 'opportunities_no_delete_won');\n\n` +
        `  select relname\n` +
        `  from pg_class c join pg_namespace n on n.oid = c.relnamespace\n` +
        `  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;\n\n` +
        `Corrige con ALTER POLICY ... TO authenticated (ver 0031_restrict_public_policies.sql) o con ` +
        `ALTER TABLE ... ENABLE ROW LEVEL SECURITY, según cuál de las dos consultas de arriba haya regresado algo.`,
    );
    process.exit(1);
  }

  console.log(`OK — ninguna tabla de public expuesta a anon fuera de lo esperado.`);
}

main();
