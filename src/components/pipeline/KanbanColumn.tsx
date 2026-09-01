"use client";

import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/common/Badge";
import { copy } from "@/config/copy";
import type { ContactRow } from "@/lib/queries/contacts";
import type { OpportunityRow, PipelineStage } from "@/lib/queries/pipeline";
import { cn } from "@/lib/utils/cn";
import {
  resolveStageAccent,
  resolveStageIcon,
  STAGE_ACCENT_BADGE_TONE,
  STAGE_ACCENT_BORDER_CLASS,
  STAGE_ACCENT_ICON_CLASS,
} from "@/lib/utils/pipeline-stage-visuals";
import { KanbanCard } from "./KanbanCard";

export function KanbanColumn({
  stage,
  stages,
  opportunities,
  contactsById,
  onMoveToStage,
}: {
  stage: PipelineStage;
  stages: PipelineStage[];
  opportunities: OpportunityRow[];
  contactsById: Map<string, ContactRow>;
  onMoveToStage: (opportunity: OpportunityRow, stage: PipelineStage, closedValue?: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const accent = resolveStageAccent(stage.accent);
  const Icon = resolveStageIcon(stage.icon);

  return (
    <div className="w-[280px] shrink-0 snap-start">
      <div
        className={cn(
          "flex items-center gap-2 rounded-t-[var(--radius-card)] border border-b-0 border-border-subtle bg-bg-surface px-3 py-2.5",
          "border-t-2",
          STAGE_ACCENT_BORDER_CLASS[accent],
        )}
      >
        <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", STAGE_ACCENT_ICON_CLASS[accent])} strokeWidth={1.5} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{stage.name}</h3>
        <Badge tone={STAGE_ACCENT_BADGE_TONE[accent]}>{opportunities.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-2 rounded-b-[var(--radius-card)] border border-t-0 border-border-subtle bg-bg-base p-2 transition-colors",
          isOver ? "border-border-strong bg-bg-sunken" : "",
        )}
      >
        {opportunities.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-text-muted">
            {copy.pipeline.board.emptyColumn}
          </p>
        ) : (
          opportunities.map((opportunity) => (
            <KanbanCard
              key={opportunity.id}
              opportunity={opportunity}
              contact={opportunity.contact_id ? contactsById.get(opportunity.contact_id) : undefined}
              stages={stages}
              onMoveToStage={(targetStage) => onMoveToStage(opportunity, targetStage)}
            />
          ))
        )}
      </div>
    </div>
  );
}
