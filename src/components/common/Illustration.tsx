import Image from "next/image";
import { cn } from "@/lib/utils/cn";

// Las 3 escenas aprobadas del Kit Prisma que hoy viven en
// public/illustrations/ (DESIGN_SYSTEM.md §5). Nombradas por lo que
// comunican, no por el nombre de archivo: así el mapeo pantalla→escena en
// cada componente se lee sin tener que abrir el PNG.
const ILLUSTRATIONS = {
  // PRISMA_ESC_10 — niño agachado con lupa encontrando el diamante entre
  // figuras genéricas. "Encontrar lo que importa" entre ruido.
  encontrar: {
    src: "/illustrations/PRISMA_ESC_10_encontrar_esencial_transparente.png",
    width: 1536,
    height: 1024,
  },
  // PRISMA_ESC_11 — equipo escribiendo, grabando y trabajando en laptop.
  // "Producir contenido/material propio."
  crear: {
    src: "/illustrations/PRISMA_ESC_11_crear_contenido_transparente.png",
    width: 1536,
    height: 1024,
  },
  // PRISMA_ESC_14 — pizarra con notas y calendario, dos personas planeando.
  // "Organizar el trabajo que viene."
  planear: {
    src: "/illustrations/PRISMA_ESC_14_planear_campana_transparente.png",
    width: 1224,
    height: 1285,
  },
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

// Alturas fijas — nunca por debajo de 80px, nunca por encima de 200px en
// estados vacíos (DESIGN_SYSTEM.md §5). `xl` es la única excepción: es para
// el acompañamiento lateral de login, que no es un estado vacío.
const SIZE_CLASSES = {
  sm: "h-24", // 96px
  md: "h-[140px]",
  lg: "h-[200px]",
  xl: "h-[280px]",
} as const;

export type IllustrationSize = keyof typeof SIZE_CLASSES;

// Sin animación a propósito: nada de fade-in, float ni entrada deslizante.
// La fase de animación de las ilustraciones de Prisma está rechazada y
// detenida (DESIGN_SYSTEM.md §6) — aparecen y ya.
export function Illustration({
  name,
  size = "md",
  alt = "",
  className,
}: {
  name: IllustrationName;
  size?: IllustrationSize;
  alt?: string;
  className?: string;
}) {
  const { src, width, height } = ILLUSTRATIONS[name];

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      aria-hidden={alt === "" ? true : undefined}
      className={cn("w-auto", SIZE_CLASSES[size], className)}
    />
  );
}
