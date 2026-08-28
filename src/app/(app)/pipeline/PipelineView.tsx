"use client";

import { AlertTriangle, Banknote, CheckCircle2, Plus, Search, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { StatCard } from "@/components/common/StatCard";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { OpportunityDialog } from "@/components/pipeline/OpportunityDialog";
import { copy } from "@/config/copy";
import { useContacts } from "@/lib/queries/contacts";
import {
  useOpportunities,
  usePipelineMetrics,
  usePipelineStages,
  useUpdateOpportunityStage,
  type OpportunityRow,
  type PipelineStage,
} from "@/lib/queries/pipeline";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
        <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
      >
        {copy.common.retry}
      </button>
    </div>
  );
}

export function PipelineView() {
  const stagesQuery = usePipelineStages();
  const opportunitiesQuery = useOpportunities();
  const metricsQuery = usePipelineMetrics();
  const contactsQuery = useContacts();
  const updateStage = useUpdateOpportunityStage();

  const stages = useMemo(() => stagesQuery.data ?? [], [stagesQuery.data]);
  const opportunities = useMemo(() => opportunitiesQuery.data ?? [], [opportunitiesQuery.data]);
  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);

  const contactsById = useMemo(() => new Map(contacts.map((contact) => [contact.id, contact])), [contacts]);

  const handleMoveToStage = (opportunity: OpportunityRow, stage: PipelineStage) => {
    updateStage.mutate({ id: opportunity.id, stageId: stage.id, isTerminal: stage.is_won || stage.is_lost });
  };

  const metrics = metricsQuery.data;
  const metricsLoading = metricsQuery.isLoading;

  const boardError = stagesQuery.isError || opportunitiesQuery.isError;
  const boardLoading = stagesQuery.isLoading || opportunitiesQuery.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.shell.nav.pipeline}
        action={
          <OpportunityDialog
            stages={stages}
            contacts={contacts}
            trigger={
              <button type="button" className={PRIMARY_BUTTON_CLASSES}>
                <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                {copy.pipeline.newOpportunity}
              </button>
            }
          />
        }
      />

      {metricsQuery.isError ? (
        <ErrorBlock onRetry={() => metricsQuery.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.newMonth}
            value={metrics?.new_month ?? 0}
            format="number"
            icon={Sparkles}
            accent="neutral"
            loading={metricsLoading}
          />
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.analyses}
            value={metrics?.analyses ?? 0}
            format="number"
            icon={Search}
            accent="neutral"
            loading={metricsLoading}
          />
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.showRate}
            value={metrics?.show_rate ?? 0}
            format="percent"
            icon={CheckCircle2}
            accent="neutral"
            loading={metricsLoading}
          />
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.closeRate}
            value={metrics?.close_rate ?? 0}
            format="percent"
            icon={Trophy}
            accent="neutral"
            loading={metricsLoading}
          />
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.volumeMonth}
            value={metrics?.volume_month ?? 0}
            format="currency"
            icon={Banknote}
            accent="neutral"
            loading={metricsLoading}
          />
          <StatCard
            size="compact"
            label={copy.pipeline.metrics.closesMonth}
            value={metrics?.closes_month ?? 0}
            format="number"
            icon={TrendingUp}
            accent="neutral"
            loading={metricsLoading}
          />
        </div>
      )}

      {boardError ? (
        <ErrorBlock
          onRetry={() => {
            stagesQuery.refetch();
            opportunitiesQuery.refetch();
          }}
        />
      ) : boardLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
        </div>
      ) : (
        <KanbanBoard
          stages={stages}
          opportunities={opportunities}
          contactsById={contactsById}
          onMoveToStage={handleMoveToStage}
        />
      )}
    </div>
  );
}
