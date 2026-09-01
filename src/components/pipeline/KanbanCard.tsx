"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useDraggable } from "@dnd-kit/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, MoreHorizontal, Trash2, Trophy, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import type { ContactRow } from "@/lib/queries/contacts";
import { useDeleteOpportunity, type OpportunityRow, type PipelineStage } from "@/lib/queries/pipeline";
import { cn } from "@/lib/utils/cn";

const CURRENCY_FORMATTER = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function formatForDeleteDialog(amount: number | null) {
  return amount === null ? copy.pipeline.card.noEstimate : CURRENCY_FORMATTER.format(amount);
}

export function KanbanCard({
  opportunity,
  contact,
  stages,
  onMoveToStage,
  dragOverlay = false,
}: {
  opportunity: OpportunityRow;
  contact: ContactRow | undefined;
  stages: PipelineStage[];
  onMoveToStage: (stage: PipelineStage) => void;
  dragOverlay?: boolean;
}) {
  // Ganar es terminal (ver update_opportunity_stage en
  // 0016_opportunity_value_split.sql): una tarjeta ya ganada no se arrastra
  // ni ofrece "Mover a…" — el servidor lo rechazaría de todos modos, pero
  // que se vea terminal en la UI evita el intento y el rebote sin explicar
  // por qué.
  const currentStage = stages.find((stage) => stage.id === opportunity.stage_id);
  const isWon = currentStage?.is_won ?? false;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opportunity.id,
    disabled: isWon,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteOpportunity = useDeleteOpportunity();

  const handleDelete = async () => {
    try {
      await deleteOpportunity.mutateAsync(opportunity.id);
      setDeleteDialogOpen(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  const deleteDescriptionValue = isWon ? opportunity.closed_value : opportunity.estimated_value;

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      {...(dragOverlay ? {} : attributes)}
      {...(dragOverlay ? {} : listeners)}
      title={isWon && !dragOverlay ? copy.pipeline.card.wonDragDisabledHint : undefined}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3 shadow-[var(--shadow-card)]",
        isDragging && !dragOverlay ? "opacity-40" : "",
        dragOverlay ? "rotate-2 opacity-90 shadow-[var(--shadow-raised)]" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {opportunity.contact_id ? (
          <Link
            href={`/contactos/${opportunity.contact_id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary underline-offset-2 hover:underline"
          >
            {opportunity.business_name}
          </Link>
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
            {opportunity.business_name}
          </p>
        )}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={copy.pipeline.card.moveToLabel}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 w-56 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
            >
              {isWon ? null : (
                <>
                  <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.pipeline.card.moveToLabel}
                  </DropdownMenu.Label>
                  {stages.map((stage) => {
                    const isCurrent = stage.id === opportunity.stage_id;
                    return (
                      <DropdownMenu.Item
                        key={stage.id}
                        disabled={isCurrent}
                        onSelect={() => onMoveToStage(stage)}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken data-[disabled]:cursor-default data-[disabled]:text-text-muted"
                      >
                        {stage.name}
                        {isCurrent ? (
                          <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                        ) : null}
                      </DropdownMenu.Item>
                    );
                  })}
                  <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
                </>
              )}
              <DropdownMenu.Item
                onSelect={() => setDeleteDialogOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                {copy.pipeline.card.deleteLabel}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {contact?.contact_name ? <p className="truncate text-xs text-text-muted">{contact.contact_name}</p> : null}

      {isWon ? (
        <Badge tone="success">
          <Trophy aria-hidden="true" className="mr-1 h-3 w-3" strokeWidth={1.5} />
          {copy.pipeline.card.wonBadge}
        </Badge>
      ) : null}

      {isWon ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">{copy.pipeline.card.closedLabel}</span>
          <MoneyValue amount={opportunity.closed_value} emptyLabel={copy.pipeline.card.noEstimate} />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">{copy.pipeline.card.estimatedLabel}</span>
          <MoneyValue amount={opportunity.estimated_value} emptyLabel={copy.pipeline.card.noEstimate} />
        </div>
      )}
      {isWon && opportunity.estimated_value !== null ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">{copy.pipeline.card.estimatedLabel}</span>
          <MoneyValue amount={opportunity.estimated_value} emptyLabel={copy.pipeline.card.noEstimate} />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-muted">{copy.pipeline.card.mrrLabel}</span>
        <MoneyValue amount={opportunity.mrr} />
      </div>

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-state-negative-soft"
              >
                <TriangleAlert className="h-5 w-5 text-state-negative" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <AlertDialog.Title className="text-lg font-semibold text-text-primary">
                  {copy.pipeline.deleteDialog.title(opportunity.business_name)}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-text-secondary">
                  {copy.pipeline.deleteDialog.description(
                    formatForDeleteDialog(deleteDescriptionValue),
                    CURRENCY_FORMATTER.format(opportunity.mrr),
                  )}
                </AlertDialog.Description>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  {copy.pipeline.deleteDialog.cancel}
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteOpportunity.isPending}
                aria-busy={deleteOpportunity.isPending}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-state-negative px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {deleteOpportunity.isPending
                  ? copy.pipeline.deleteDialog.confirming
                  : copy.pipeline.deleteDialog.confirm}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
