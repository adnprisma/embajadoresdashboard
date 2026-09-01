import { Circle, type LucideIcon, MessageCircle, PhoneOff, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import type { ReactNode } from "react";
import { CONTACT_STATUS_TONE, type ContactStatus, type ContactStatusTone } from "@/config/contactStatus";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils/cn";

// Compartido entre la ficha (badge con menú desplegable) y /contactos
// (columna Estado) — una sola fuente para el ícono y el tono de cada
// estado, en vez de mantenerlo dos veces.
export const STATUS_ICON = {
  sin_contactar: Circle,
  contactado: Send,
  respondio: MessageCircle,
  interesado: ThumbsUp,
  no_interesado: ThumbsDown,
  ilocalizable: PhoneOff,
} satisfies Record<ContactStatus, LucideIcon>;

// El color codifica desenlace, no identidad — mismo criterio que la
// Prioridad de la vista Comparativa: nunca coral, el coral es acción.
export const STATUS_TONE_CLASSES: Record<ContactStatusTone, string> = {
  neutral: "border-border-subtle text-text-secondary bg-bg-sunken",
  progress: "border-state-progress text-state-progress bg-state-progress-soft",
  positive: "border-state-positive text-state-positive bg-state-positive-soft",
  negative: "border-state-negative text-state-negative bg-state-negative-soft",
};

// `children` es solo para el chevron del menú desplegable de la ficha — la
// columna de /contactos lo deja vacío, un badge informativo sin más.
export function StatusBadge({ status, className, children }: { status: ContactStatus; className?: string; children?: ReactNode }) {
  const tone = CONTACT_STATUS_TONE[status];
  const Icon = STATUS_ICON[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      {copy.contactos.status.labels[status]}
      {children}
    </span>
  );
}
