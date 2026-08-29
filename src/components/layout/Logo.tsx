import Image from "next/image";
import { BRAND } from "@/config/brand";

// LOGOTIPO — decisión de marca tomada, con excepción explícita: los 6
// archivos de public/brand/ están generados por IA (confirmable con
// `grep -l trainedAlgorithmicMedia public/brand/*.png`), aprobados a
// sabiendas SOLO para esta interfaz — nunca en material comercial,
// impresos, propuestas a clientes ni registro de marca. Ver CLAUDE.md §2 y
// DESIGN_SYSTEM.md §9 para la matriz completa y la nota de reemplazo
// cuando exista el vector original.
//
// `variant` usa el nombre del token de marca ("coral"), aunque el archivo
// en disco se llame "rojo" — el mapeo vive únicamente aquí.
const FILES = {
  carbon: { isotipo: "/brand/isotipo_carbon.png", firma: "/brand/logotipo_carbon.png" },
  coral: { isotipo: "/brand/isotipo_rojo.png", firma: "/brand/logotipo_rojo.png" },
  beige: { isotipo: "/brand/isotipo_beige.png", firma: "/brand/logotipo_beige.png" },
} as const;

// Relación de aspecto real de cada forma (isotipo 1254x1254, firma
// 2172x724) — de aquí sale el ancho para cualquier alto que se pida.
const ASPECT_RATIO = {
  isotipo: 1254 / 1254,
  firma: 2172 / 724,
} as const;

export type LogoVariant = keyof typeof FILES;
export type LogoForm = keyof typeof ASPECT_RATIO;

export function Logo({
  variant = "carbon",
  form = "firma",
  height = 32,
  // false por defecto a propósito: la firma ya trae la palabra "Prisma"
  // dibujada. Solo pásalo en true junto con form="isotipo" (el único caso
  // sin la palabra) donde de verdad haga falta texto al lado — si no, se
  // lee dos veces.
  showName = false,
}: {
  variant?: LogoVariant;
  form?: LogoForm;
  height?: number;
  showName?: boolean;
}) {
  const src = FILES[variant][form];
  const width = Math.round(height * ASPECT_RATIO[form]);

  return (
    <div className="flex items-center gap-2">
      <Image
        src={src}
        alt={showName ? "" : BRAND.name}
        aria-hidden={showName ? true : undefined}
        width={width}
        height={height}
        priority
        // El optimizador de next/image rechaza estos PNG con 400 ("isn't a
        // valid image") — el chunk C2PA que declara el origen por IA (ver
        // la excepción de procedencia arriba) confunde su sniffer de
        // formato, aunque sharp los lee bien de forma directa (probado:
        // scripts/generate-brand-icons.mjs los procesa sin problema). Sin
        // unoptimized, el logo no carga en ningún tamaño.
        unoptimized
        className="shrink-0"
        style={{ height, width }}
      />
      {showName ? (
        <span className="font-[var(--font-display)] text-lg text-[var(--text-primary)]">{BRAND.name}</span>
      ) : null}
    </div>
  );
}
