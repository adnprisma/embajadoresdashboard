// Genera el favicon y los íconos de app a partir del isotipo coral
// (public/brand/isotipo_rojo.png, 1254x1254). Coral y no carbón: el
// carbón desaparece en pestañas de navegador con tema oscuro. Ver
// context/DESIGN_SYSTEM.md §9 — nunca a mano, nunca con otra herramienta,
// nunca desde el logotipo completo (la firma).
//
// Uso: node scripts/generate-brand-icons.mjs
// Requiere que public/brand/isotipo_rojo.png ya exista.

import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "public/brand/isotipo_rojo.png");

const TARGETS = [
  { size: 32, out: path.join(ROOT, "src/app/icon.png") },
  { size: 180, out: path.join(ROOT, "src/app/apple-icon.png") },
  // 512px: no es una convención de Next.js (icon.png/apple-icon.png solo
  // necesitan las dos de arriba) — se deja disponible para un futuro
  // manifest.json de PWA sin tener que volver a correr sharp.
  { size: 512, out: path.join(ROOT, "public/brand/isotipo_rojo-512.png") },
];

if (!existsSync(SOURCE)) {
  console.error(`No existe ${path.relative(ROOT, SOURCE)}. Agrega el isotipo coral ahí antes de correr este script.`);
  process.exit(1);
}

for (const { size, out } of TARGETS) {
  await sharp(SOURCE).resize(size, size).png().toFile(out);
  console.log(`${path.relative(ROOT, out)} (${size}x${size})`);
}
