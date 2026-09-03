// Genera un logotipo_beige redimensionado para un solo uso: el encabezado
// (28px de alto) de la vista imprimible de cotizaciones
// (src/components/pipeline/QuotePrintView.tsx). El original en
// public/brand/logotipo_beige.png es 2172x724 (434KB) — mucho más de lo que
// un encabezado de documento necesita, y como next/image sirve estos PNG con
// `unoptimized` (el chunk C2PA hace que su optimizador los rechace, ver el
// comentario en src/components/layout/Logo.tsx), el archivo original se
// mandaría tal cual, sin redimensionar en servidor. Mismo patrón que
// generate-brand-icons.mjs con isotipo_rojo-512.png: nunca a mano, siempre
// por script, para que quede documentado de dónde sale el archivo chico.
//
// Uso: node scripts/generate-logo-print.mjs
// Requiere que public/brand/logotipo_beige.png ya exista.

import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public/brand/logotipo_beige.png");
const OUT = path.join(ROOT, "public/brand/logotipo_beige-print.png");

// 168px de alto (6× el height=28 que usa QuotePrintView): suficiente
// resolución para verse nítido incluso en impresión de alto DPI, sin cargar
// el archivo completo de 2172x724.
//
// sharp borra el chunk C2PA al reprocesar — el archivo resultante da False
// en `grep -l trainedAlgorithmicMedia`, igual que isotipo_rojo-512.png. NO
// es un archivo distinto ni deja de ser IA: es la misma imagen de origen sin
// la etiqueta (ver BRANDING.md, fila [LOGO]). Sigue bajo la misma excepción
// de marca que logotipo_beige.png — no lo trates como "ya no es IA".
const HEIGHT = 168;

if (!existsSync(SOURCE)) {
  console.error(`No existe ${path.relative(ROOT, SOURCE)}. Agrega el logotipo beige ahí antes de correr este script.`);
  process.exit(1);
}

await sharp(SOURCE).resize({ height: HEIGHT }).png().toFile(OUT);
console.log(`${path.relative(ROOT, OUT)} (alto ${HEIGHT}px)`);
