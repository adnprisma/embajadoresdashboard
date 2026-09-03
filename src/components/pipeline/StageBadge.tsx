import type { ReactNode } from "react";
import type { PipelineStage } from "@/lib/queries/pipeline";
import { cn } from "@/lib/utils/cn";
import { resolveStageAccent, resolveStageIcon, type StageAccent } from "@/lib/utils/pipeline-stage-visuals";

// Mismo criterio que StatusBadge (contactos): el color codifica desenlace,
// no identidad — ver DESIGN_SYSTEM.md §2 "Acento de etapa en el pipeline".
const STAGE_TONE_CLASSES: Record<StageAccent, string> = {
  neutral: "border-border-subtle text-text-secondary bg-bg-sunken",
  pending: "border-state-pending text-state-pending bg-state-pending-soft",
  positive: "border-state-positive text-state-positive bg-state-positive-soft",
  negative: "border-state-negative text-state-negative bg-state-negative-soft",
};

// `children` es solo para el chevron del menú "Mover a…" en el encabezado
// de /pipeline/[id] — en cualquier otro uso se deja vacío.
export function StageBadge({ stage, className, children }: { stage: PipelineStage; className?: string; children?: ReactNode }) {
  const accent = resolveStageAccent(stage.accent);
  const Icon = resolveStageIcon(stage.icon);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STAGE_TONE_CLASSES[accent],
        className,
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      {stage.name}
      {children}
    </span>
  );
}
