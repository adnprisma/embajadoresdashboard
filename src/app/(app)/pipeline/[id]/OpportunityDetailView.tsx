"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, ChevronDown, FileText, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { CloseOpportunityDialog } from "@/components/pipeline/CloseOpportunityDialog";
import { QuoteBreakdown } from "@/components/pipeline/QuoteBreakdown";
import { StageBadge } from "@/components/pipeline/StageBadge";
import { copy } from "@/config/copy";
import {
  useOpportunity,
  usePipelineStages,
  useUpdateOpportunityEstimatedValue,
  useUpdateOpportunityNotes,
  useUpdateOpportunityStage,
  type OpportunityDetail,
  type PipelineStage,
} from "@/lib/queries/pipeline";
import { useQuoteHistory } from "@/lib/queries/quotes";
import { cn } from "@/lib/utils/cn";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-60";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

// Ganada = terminal: sin menú, igual que KanbanCard (0016_opportunity_value_split.sql
// la vuelve irreversible). Perdida SÍ se puede mover — es la salida
// explícita para revivirla, ver copy.pipeline.detail.estimatedValue.lockedTerminalLost.
function StageMoveControl({
  current,
  stages,
  onSelect,
}: {
  current: OpportunityDetail;
  stages: PipelineStage[];
  onSelect: (stage: PipelineStage) => void;
}) {
  const currentStage = stages.find((stage) => stage.id === current.stage_id);
  if (!currentStage) return null;
  if (currentStage.is_won) return <StageBadge stage={currentStage} />;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={copy.pipeline.card.moveToLabel}>
          <StageBadge stage={currentStage} className="cursor-pointer py-1.5 pr-2 transition-colors">
            <ChevronDown aria-hidden="true" className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
          </StageBadge>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 w-56 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {copy.pipeline.card.moveToLabel}
          </DropdownMenu.Label>
          {stages.map((stage) => {
            const isCurrent = stage.id === current.stage_id;
            return (
              <DropdownMenu.Item
                key={stage.id}
                disabled={isCurrent}
                onSelect={() => onSelect(stage)}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken data-[disabled]:cursor-default data-[disabled]:text-text-muted"
              >
                {stage.name}
                {isCurrent ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> : null}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function OpportunityDetailView({
  opportunity: initialOpportunity,
  isAdmin,
}: {
  opportunity: OpportunityDetail;
  isAdmin: boolean;
}) {
  const { data: opportunity } = useOpportunity(initialOpportunity.id, initialOpportunity);
  const current = opportunity ?? initialOpportunity;

  const { data: stagesData } = usePipelineStages();
  const stages = stagesData ?? [];
  const currentStage = stages.find((stage) => stage.id === current.stage_id);
  const isWon = currentStage?.is_won ?? false;
  const isLost = currentStage?.is_lost ?? false;

  const { data: quotesData, isLoading: quotesLoading } = useQuoteHistory(current.id);
  const quotes = quotesData ?? [];
  const hasQuotes = quotes.length > 0;
  const latestQuoteId = quotes[0]?.id ?? null;

  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const displayedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? quotes[0] ?? null;

  const updateStage = useUpdateOpportunityStage();
  const [pendingWinCapture, setPendingWinCapture] = useState<PipelineStage | null>(null);

  const requestMoveToStage = (stage: PipelineStage) => {
    if (stage.is_won) {
      setPendingWinCapture(stage);
      return;
    }
    updateStage.mutate({ id: current.id, stageId: stage.id });
  };

  const handleConfirmWin = (closedValue: number) => {
    if (!pendingWinCapture) return;
    updateStage.mutate({ id: current.id, stageId: pendingWinCapture.id, closedValue });
    setPendingWinCapture(null);
  };

  // Notas: siempre editables, sin candado — solo el valor estimado lo tiene.
  const updateNotes = useUpdateOpportunityNotes(current.id);
  const [notesValue, setNotesValue] = useState(current.notes ?? "");
  useEffect(() => {
    setNotesValue(current.notes ?? "");
  }, [current.notes]);
  const notesDirty = notesValue !== (current.notes ?? "");

  // Candado del valor estimado: etapa terminal gana siempre sobre "hay
  // cotización" — una oportunidad ganada o perdida no se vuelve editable
  // solo porque nunca se generó una cotización sobre ella.
  const estimatedValueLockedReason = isWon
    ? copy.pipeline.detail.estimatedValue.lockedTerminalWon
    : isLost
      ? copy.pipeline.detail.estimatedValue.lockedTerminalLost
      : hasQuotes
        ? copy.pipeline.detail.estimatedValue.lockedHasQuote
        : null;
  const estimatedValueLocked = estimatedValueLockedReason !== null;

  const updateEstimatedValue = useUpdateOpportunityEstimatedValue(current.id);
  const [estimatedValueInput, setEstimatedValueInput] = useState(
    current.estimated_value !== null ? String(current.estimated_value) : "",
  );
  useEffect(() => {
    setEstimatedValueInput(current.estimated_value !== null ? String(current.estimated_value) : "");
  }, [current.estimated_value]);
  const estimatedValueDirty =
    !estimatedValueLocked &&
    estimatedValueInput !== (current.estimated_value !== null ? String(current.estimated_value) : "") &&
    estimatedValueInput !== "" &&
    !Number.isNaN(Number(estimatedValueInput)) &&
    Number(estimatedValueInput) >= 0;

  const handleSaveNotes = async () => {
    await updateNotes.mutateAsync(notesValue);
  };

  const handleSaveEstimatedValue = async () => {
    await updateEstimatedValue.mutateAsync(Number(estimatedValueInput));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={current.business_name}
        action={
          <div className="flex gap-2">
            {hasQuotes && latestQuoteId ? (
              <Link href={`/pipeline/${current.id}/cotizaciones/${latestQuoteId}/imprimir`} className={SECONDARY_BUTTON_CLASSES}>
                <Printer aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                {copy.pipeline.detail.actions.viewPrint}
              </Link>
            ) : null}
            {/* Sin esto, "generar cotización" sería alcanzable en una
            oportunidad ganada o perdida — el candado real vive en
            generate_quote() (0023_quotes.sql) y en el propio
            /cotizaciones/nueva/page.tsx (URL directa), pero el botón no
            debe ofrecerlo ni para el caso normal de navegación. */}
            {!isWon && !isLost ? (
              <Link href={`/pipeline/${current.id}/cotizaciones/nueva`} className={PRIMARY_BUTTON_CLASSES}>
                <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                {copy.pipeline.detail.actions.newQuote}
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          {current.contact_id ? (
            <Link
              href={`/contactos/${current.contact_id}`}
              className="text-sm font-medium text-text-primary underline-offset-2 hover:underline"
            >
              {current.contact_business_name ?? copy.pipeline.detail.header.viewContact}
            </Link>
          ) : (
            <span className="text-sm text-text-muted">{copy.pipeline.detail.header.noContact}</span>
          )}

          <StageMoveControl current={current} stages={stages} onSelect={requestMoveToStage} />

          {isAdmin ? (
            <p className="text-sm text-text-secondary">
              {copy.pipeline.detail.header.ownerLabel(current.owner_full_name ?? "—")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 sm:items-end">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {copy.pipeline.detail.estimatedValue.label}
          </span>
          {estimatedValueLocked ? (
            <>
              <span className="text-xl font-semibold text-text-primary">
                <MoneyValue amount={current.estimated_value} emptyLabel={copy.pipeline.card.noEstimate} />
              </span>
              <p className="max-w-xs text-xs text-text-muted sm:text-right">{estimatedValueLockedReason}</p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedValueInput}
                onChange={(event) => setEstimatedValueInput(event.target.value)}
                placeholder={copy.pipeline.detail.estimatedValue.placeholder}
                aria-label={copy.pipeline.detail.estimatedValue.label}
                className={cn(INPUT_CLASSES, "w-36 text-right numeric")}
              />
              {estimatedValueDirty ? (
                <button
                  type="button"
                  onClick={handleSaveEstimatedValue}
                  disabled={updateEstimatedValue.isPending}
                  aria-busy={updateEstimatedValue.isPending}
                  className={SECONDARY_BUTTON_CLASSES}
                >
                  {updateEstimatedValue.isPending
                    ? copy.pipeline.detail.estimatedValue.saving
                    : copy.pipeline.detail.estimatedValue.save}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {quotesLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !hasQuotes ? (
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
          <EmptyState
            icon={FileText}
            title={copy.pipeline.detail.emptyState.title}
            description={copy.pipeline.detail.emptyState.description}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div>{displayedQuote ? <QuoteBreakdown quote={displayedQuote} /> : null}</div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{copy.pipeline.detail.history.title}</h3>
            {quotes.map((quote) => (
              <button
                key={quote.id}
                type="button"
                onClick={() => setSelectedQuoteId(quote.id)}
                className={cn(
                  "flex flex-col gap-0.5 rounded-[var(--radius-card)] border px-3 py-2 text-left text-sm transition-colors",
                  (displayedQuote?.id ?? latestQuoteId) === quote.id
                    ? "border-accent bg-state-progress-soft"
                    : "border-border-subtle bg-bg-surface hover:bg-bg-sunken",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">
                    {format(parseISO(quote.createdAt), "d MMM yyyy", { locale: es })}
                  </span>
                  {quote.id === latestQuoteId ? (
                    <span className="text-xs font-medium text-state-positive">{copy.pipeline.detail.history.current}</span>
                  ) : null}
                </span>
                <MoneyValue amount={quote.total} />
                <span className="text-xs text-text-muted">
                  {copy.pipeline.detail.history.by(quote.createdByName ?? "—")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
        <label htmlFor="opportunity-notes" className="text-sm font-medium text-text-primary">
          {copy.pipeline.detail.notes.label}
        </label>
        <textarea
          id="opportunity-notes"
          value={notesValue}
          onChange={(event) => setNotesValue(event.target.value)}
          placeholder={copy.pipeline.detail.notes.placeholder}
          rows={3}
          className={cn(INPUT_CLASSES, "resize-y")}
        />
        {notesDirty ? (
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={updateNotes.isPending}
            aria-busy={updateNotes.isPending}
            className={cn(SECONDARY_BUTTON_CLASSES, "self-start")}
          >
            {updateNotes.isPending ? copy.pipeline.detail.notes.saving : copy.pipeline.detail.notes.save}
          </button>
        ) : null}
      </div>

      <CloseOpportunityDialog
        opportunity={pendingWinCapture ? current : null}
        open={pendingWinCapture !== null}
        onOpenChange={(open) => {
          if (!open) setPendingWinCapture(null);
        }}
        onConfirm={handleConfirmWin}
        isSubmitting={updateStage.isPending}
      />
    </div>
  );
}
