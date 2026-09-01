"use client";

import { Activity, AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { FUNNEL_STATUSES, type ContactStatus } from "@/config/contactStatus";
import { copy } from "@/config/copy";
import { useWeeklyStatusFunnel } from "@/lib/queries/weeklyStatusFunnel";

function toCountByStatus(rows: { to_status: ContactStatus; contact_count: number }[]) {
  const map = new Map<ContactStatus, number>();
  for (const row of rows) map.set(row.to_status, row.contact_count);
  return map;
}

// Solo para vendedoras — el RPC ya se auto-limita a lo propio cuando quien
// llama no es admin (weekly_status_funnel(), 0019), así que aquí no hay
// nada más que filtrar. Mismo embudo que /equipo, pero presentado como
// ritmo personal: sin comparar con nadie, sin porcentaje.
export function WeeklyRhythmPanel() {
  const currentWeekQuery = useWeeklyStatusFunnel(0);
  const previousWeekQuery = useWeeklyStatusFunnel(1);

  const currentByStatus = useMemo(() => toCountByStatus(currentWeekQuery.data ?? []), [currentWeekQuery.data]);
  const previousByStatus = useMemo(
    () => toCountByStatus(previousWeekQuery.data ?? []),
    [previousWeekQuery.data],
  );

  const loading = currentWeekQuery.isLoading || previousWeekQuery.isLoading;
  const hasError = currentWeekQuery.isError || previousWeekQuery.isError;
  const hasMovement = (currentWeekQuery.data ?? []).length > 0 || (previousWeekQuery.data ?? []).length > 0;

  return (
    <Panel title={copy.dashboard.weeklyRhythm.title} subtitle={copy.dashboard.weeklyRhythm.subtitle}>
      {hasError ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              currentWeekQuery.refetch();
              previousWeekQuery.refetch();
            }}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !hasMovement ? (
        <EmptyState
          icon={Activity}
          illustration={<Illustration name="encontrar" size="sm" />}
          title={copy.dashboard.weeklyRhythm.emptyTitle}
          description={copy.dashboard.weeklyRhythm.emptyDescription}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {FUNNEL_STATUSES.map((status) => (
            <div key={status}>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                {copy.contactos.status.labels[status]}
              </p>
              <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                {currentByStatus.get(status) ?? 0}
              </p>
              <p className="numeric text-xs text-text-muted">
                {copy.dashboard.weeklyRhythm.previousWeekLabel}: {previousByStatus.get(status) ?? 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
