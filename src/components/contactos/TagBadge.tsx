import { MapPin } from "lucide-react";
import { isOperationalTag } from "@/config/contactTags";
import { Badge } from "@/components/common/Badge";
import { cn } from "@/lib/utils/cn";

// Distingue visualmente una etiqueta operativa (lista cerrada, ver
// contactTags.ts) de una de alcaldía (texto libre) — misma columna en la
// base, sin forma de separarlas ahí, así que la distinción es puramente de
// este componente. Mismo criterio que StatusBadge: tono + ícono, nunca
// solo color.
export function TagBadge({ tag }: { tag: string }) {
  if (!isOperationalTag(tag)) {
    return <Badge tone="neutral">{tag}</Badge>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium",
        "bg-state-pending-soft text-state-pending",
      )}
    >
      <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.75} />
      {tag}
    </span>
  );
}
