import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { copy } from "@/config/copy";
import { OFERTA_POR_CAPACIDAD, type Capacidad } from "@/config/oferta";
import { cn } from "@/lib/utils/cn";

// Orden fijo de la rejilla — el mismo de la tabla comparativa de origen
// (ver copy.contactos.fields / migración 0012), independiente del orden de
// declaración de OFERTA_POR_CAPACIDAD en config/oferta.ts. Compartido entre
// la pestaña Análisis y la vista Comparativa de /contactos — una sola fuente
// para el tri-estado, no dos implementaciones que mantener en paralelo.
export const CAPABILITY_ORDER: Capacidad[] = [
  "has_web",
  "has_whatsapp",
  "has_reservas",
  "has_crm",
  "has_chat",
  "has_blog",
  "has_redes",
];

export const CAPABILITY_TONE_CLASSES = {
  success: "border-state-positive text-state-positive bg-state-positive-soft",
  danger: "border-state-negative text-state-negative bg-state-negative-soft",
  warning: "border-state-pending text-state-pending bg-state-pending-soft",
} as const;

// El ícono ya distingue el estado por forma (check/cruz/guion), no solo por
// color — el texto de estado (stateLabel) es lo que arma el aria-label en
// ambos consumidores, para que un lector de pantalla nunca dependa del color.
export function capabilityVisual(value: boolean | null) {
  const { capabilityState } = copy.contactos.detail.analysisTab;
  if (value === true) return { Icon: CheckCircle2, tone: "success" as const, stateLabel: capabilityState.present };
  if (value === false) return { Icon: XCircle, tone: "danger" as const, stateLabel: capabilityState.absent };
  return { Icon: MinusCircle, tone: "warning" as const, stateLabel: capabilityState.partial };
}

export function CapabilityChip({
  capacidad,
  value,
  title,
}: {
  capacidad: Capacidad;
  value: boolean | null;
  title?: string | null;
}) {
  const { Icon, tone, stateLabel } = capabilityVisual(value);
  const label = OFERTA_POR_CAPACIDAD[capacidad].carencia;

  return (
    <span
      title={title ?? undefined}
      aria-label={`${label}: ${stateLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        CAPABILITY_TONE_CLASSES[tone],
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
    </span>
  );
}

// Versión compacta para columnas angostas (tabla Comparativa): solo el
// ícono, mismo color y mismo aria-label ("WhatsApp visible: Ausente") — el
// texto vive en el encabezado de columna, repetirlo en cada celda sería
// ruido. `role="img"` sigue el mismo patrón que ScoreCircle en el detalle.
export function CapabilityIcon({ capacidad, value }: { capacidad: Capacidad; value: boolean | null }) {
  const { Icon, tone, stateLabel } = capabilityVisual(value);
  const label = OFERTA_POR_CAPACIDAD[capacidad].carencia;
  const toneTextClass = {
    success: "text-state-positive",
    danger: "text-state-negative",
    warning: "text-state-pending",
  }[tone];

  return (
    <span role="img" aria-label={`${label}: ${stateLabel}`} title={`${label}: ${stateLabel}`} className="flex justify-center">
      <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", toneTextClass)} strokeWidth={1.75} />
    </span>
  );
}
