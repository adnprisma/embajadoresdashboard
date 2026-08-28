"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Banknote, Calendar, Inbox, TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { StatCard } from "@/components/common/StatCard";
import { CommissionsChart } from "@/components/dinero/CommissionsChart";
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_ACCENT,
  COMMISSION_STATUS_BADGE_TONE,
  COMMISSION_STATUSES_WITH_ESTIMATE_NOTE,
  type CommissionStatus,
} from "@/config/commission-status";
import { copy } from "@/config/copy";
import { useRealtimeInvalidate } from "@/hooks/useRealtimeInvalidate";
import { dashboardKeys, useDashboardSummary } from "@/lib/queries/dashboard";

function useSecondsAgo(timestamp: number | undefined) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!timestamp) return;
    const update = () => setSeconds(Math.max(0, Math.round((Date.now() - timestamp) / 1000)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return seconds;
}

function formatPeriod(period: string) {
  const label = format(parseISO(period), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatRenewalDate(date: string) {
  return format(parseISO(date), "d 'de' MMMM", { locale: es });
}

// Estas 4 mini-tarjetas y las 4 de arriba de /dinero comparten etiqueta de
// estado pero NO periodo (aquí es solo el mes en curso; en /dinero es todo
// el histórico) — sin esta línea, la misma etiqueta con cifras distintas
// se lee como un error de los datos, no como un filtro de tiempo distinto.
function getMiniCardHint(status: CommissionStatus) {
  return COMMISSION_STATUSES_WITH_ESTIMATE_NOTE.includes(status)
    ? `${copy.common.thisMonthNote} · ${copy.common.estimatedNote}`
    : copy.common.thisMonthNote;
}

export function DashboardView({
  greetingName,
  billingComplete,
}: {
  greetingName: string;
  billingComplete: boolean;
}) {
  const { data, isLoading, isError, dataUpdatedAt, refetch } = useDashboardSummary();
  useRealtimeInvalidate("commissions", dashboardKeys.summary());
  const secondsAgo = useSecondsAgo(dataUpdatedAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.dashboard.greeting(greetingName)}
        action={
          !isLoading && !isError ? (
            <p className="text-xs text-text-muted">{copy.common.updatedSecondsAgo(secondsAgo)}</p>
          ) : undefined
        }
      />

      {!billingComplete ? (
        <AlertBanner
          tone="warning"
          icon={AlertTriangle}
          title={copy.dashboard.billingIncompleteAlert.title}
          description={copy.dashboard.billingIncompleteAlert.description}
          href="/perfil"
        />
      ) : null}

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={copy.dashboard.stats.earnedThisMonth}
              value={data?.earned_this_month ?? 0}
              format="currency"
              icon={Banknote}
              accent="neutral"
              loading={isLoading}
            />
            <StatCard
              label={copy.dashboard.stats.activeClients}
              value={data?.active_clients ?? 0}
              format="number"
              icon={Users}
              accent="neutral"
              loading={isLoading}
            />
            <StatCard
              label={copy.dashboard.stats.mrr}
              value={data?.mrr ?? 0}
              format="currency"
              icon={TrendingUp}
              accent="neutral"
              loading={isLoading}
            />
            <StatCard
              label={copy.dashboard.stats.ranking}
              value={data ? `#${data.ranking.position}` : "#—"}
              icon={Trophy}
              accent="neutral"
              hint={data ? copy.dashboard.stats.rankingHint(data.ranking.total_users) : undefined}
              href="/ranking"
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMMISSION_STATUSES.map((status) => {
              const entry = data?.commission_status[status];
              return (
                <StatCard
                  key={status}
                  label={copy.dashboard.commissionStatuses[status]}
                  value={entry?.amount ?? 0}
                  format="currency"
                  icon={Banknote}
                  accent={COMMISSION_STATUS_ACCENT[status]}
                  hint={getMiniCardHint(status)}
                  href={`/dinero?estado=${status}`}
                  loading={isLoading}
                  size="compact"
                />
              );
            })}
          </div>

          <Panel title={copy.dashboard.salesPanel.title}>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.dashboard.salesPanel.newMonth}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {data?.sales.new_month ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.dashboard.salesPanel.closesMonth}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {data?.sales.closes_month ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.dashboard.salesPanel.closeRate}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(
                      (data?.sales.close_rate ?? 0) / 100,
                    )}
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel title={copy.dashboard.commissionsChart.title}>
            {isLoading || !data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <CommissionsChart data={data.chart_series} />
            )}
          </Panel>

          <Panel title={copy.dashboard.recentCommissions.title}>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !data || data.recent_commissions.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={copy.dashboard.recentCommissions.emptyTitle}
                description={copy.dashboard.recentCommissions.emptyDescription}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {data.recent_commissions.map((commission) => (
                  <li key={commission.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {commission.concept}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {commission.client_name ?? copy.dashboard.recentCommissions.withoutClient} ·{" "}
                        {formatPeriod(commission.period)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone={COMMISSION_STATUS_BADGE_TONE[commission.status as CommissionStatus]}>
                        {copy.dashboard.commissionStatuses[commission.status as CommissionStatus]}
                      </Badge>
                      <span className="text-sm font-medium">
                        <MoneyValue amount={commission.amount} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={copy.dashboard.upcomingRenewals.title}>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !data || data.upcoming_renewals.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={copy.dashboard.upcomingRenewals.emptyTitle}
                description={copy.dashboard.upcomingRenewals.emptyDescription}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {data.upcoming_renewals.map((client) => (
                  <li key={client.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{client.name}</p>
                      <p className="truncate text-xs text-text-muted">
                        {copy.dashboard.upcomingRenewals.renewsOn(formatRenewalDate(client.next_renewal))}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">
                      <MoneyValue amount={client.mrr} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
