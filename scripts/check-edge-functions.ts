// ---------------------------------------------------------------
// Valida que cada supabase/functions/<nombre>/index.ts sea sintácticamente
// válido ANTES de pegarlo en el editor de Edge Functions del panel de
// Supabase — nació el 11 de septiembre de 2026, cuando create-seller
// falló el bundle en el panel ("Expected ',', got ')'") con un archivo que
// en el repo estaba perfectamente sano. El archivo del repo nunca había
// pasado por nada: tsconfig.json lo excluye a propósito (es Deno, no
// Node/Next — ver el comentario ahí), así que ni tsc del build ni el lint
// lo tocaban. Esto no reemplaza esa exclusión — corre APARTE, con flags
// mínimos, apuntando directo al archivo.
//
// Uso: npx tsx scripts/check-edge-functions.ts
// Corre esto cada vez que edites cualquier supabase/functions/*/index.ts,
// antes de volver a pegarlo en el panel — es la única forma de detectar un
// archivo roto sin descubrirlo ahí. No está en pre-push ni en el build de
// Vercel a propósito: estos archivos no los despliega ningún push, los
// despliega el admin a mano desde el panel (ver CLAUDE.md, sección de
// alta de vendedoras) — no tiene caso bloquear un push por un archivo que
// ese push no va a tocar.
//
// CÓMO LEER LA SALIDA: usamos tsc (ya viene con el proyecto, nada que
// instalar) apuntado directo al archivo, sin pasar por tsconfig.json —
// eso evita que la exclusión de arriba lo esconda, y evita que las reglas
// de Next contaminen el chequeo. Pero tsc sigue sin saber qué es Deno, así
// que SIEMPRE va a quejarse de dos cosas que NO son errores reales:
//   - "Cannot find module 'npm:...'"  -> el especificador npm: de Deno,
//     tsc no lo resuelve. Ruido esperado.
//   - "Cannot find name 'Deno'"       -> el global de Deno no existe en
//     los tipos de Node/DOM que tiene este proyecto. Ruido esperado.
// Cualquier OTRA cosa — "Expected ','", "Declaration or statement
// expected", token inesperado, llave/paréntesis sin cerrar — es un error
// real de sintaxis. Ese es justo el que se nos escapó la primera vez.
// ---------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = join(import.meta.dirname, "..", "supabase", "functions");
const TSC_BIN = join(import.meta.dirname, "..", "node_modules", ".bin", "tsc");

// Mismas dos causas que documenta el header de arriba — si tsc agrega
// algún día una tercera forma de quejarse de Deno/npm:, se agrega aquí,
// no se afloja el criterio de abajo.
const EXPECTED_NOISE = [/Cannot find module 'npm:/, /Cannot find name 'Deno'/];

function listFunctionEntryFiles(): string[] {
  if (!existsSync(FUNCTIONS_DIR)) return [];
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FUNCTIONS_DIR, entry.name, "index.ts"))
    .filter((path) => existsSync(path));
}

function checkFile(path: string): string[] {
  try {
    execFileSync(
      TSC_BIN,
      ["--noEmit", "--skipLibCheck", "--target", "esnext", "--module", "esnext", "--moduleResolution", "bundler", path],
      { encoding: "utf-8", stdio: "pipe" },
    );
    return [];
  } catch (error) {
    const output = (error as { stdout?: string }).stdout ?? "";
    return output
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .filter((line) => !EXPECTED_NOISE.some((pattern) => pattern.test(line)));
  }
}

function main() {
  const files = listFunctionEntryFiles();

  if (files.length === 0) {
    console.log("OK — no hay funciones en supabase/functions/ todavía.");
    return;
  }

  let anyRealError = false;

  for (const file of files) {
    const realErrors = checkFile(file);
    if (realErrors.length > 0) {
      anyRealError = true;
      console.error(`[SINTAXIS] ${file} tiene errores reales, no ruido de Deno/npm::\n  ${realErrors.join("\n  ")}`);
    } else {
      console.log(`OK — ${file} es sintácticamente válido (el ruido esperado de Deno/npm: no cuenta).`);
    }
  }

  if (anyRealError) {
    console.error(
      "\nCorrige lo de arriba antes de volver a pegar el archivo en el editor del panel de Supabase — ver el header de este script para qué es ruido esperado y qué no.",
    );
    process.exit(1);
  }
}

main();
