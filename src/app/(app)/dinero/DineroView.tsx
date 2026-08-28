"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Banknote, Inbox, Lock, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Skeleton } from "@/components/common/Skeleton";
import { StatCard } from "@/components/common/StatCard";
import {
  COMMISSION_STATUS_ACCENT,
  COMMISSION_STATUS_BADGE_TONE,
  COMMISSION_STATUSES,
  isCommissionStatus,
  type CommissionStatus,
} from "@/config/commission-status";
import { copy } from "@/config/copy";
import { useCommissionsHistory, useWalletHistory, useWalletSummary } from "@/lib/queries/wallet";

type CommissionRow = {
  id: string;
  concept: string;
  amount: number;
  status: string;
  is_estimate: boolean;
  folio: string | null;
  period: string;
  paid_at: string | null;
};

type WalletKind = "earned" | "released" | "redeemed" | "adjustment";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPeriod(period: string) {
  return capitalize(format(parseISO(period), "MMMM yyyy", { locale: es }));
}

function formatShortDate(date: string) {
  return format(parseISO(date), "d MMM yyyy", { locale: es });
}

function ErrorBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

const HISTORY_FILTER_OPTIONS: { value: "all" | CommissionStatus; label: string }[] = [
  { value: "all", label: copy.dinero.filterAll },
  ...COMMISSION_STATUSES.map((status) => ({
    value: status,
    label: copy.dashboard.commissionStatuses[status],
  })),
];

const WALLET_STATUS_OPTIONS: { value: "all" | "available" | "locked"; label: string }[] = [
  { value: "all", label: copy.dinero.filterAll },
  { value: "available", label: copy.dinero.walletPanel.filterStatusAvailable },
  { value: "locked", label: copy.dinero.walletPanel.filterStatusLocked },
];

const WALLET_KIND_LABEL: Record<WalletKind, string> = {
  earned: copy.dinero.walletPanel.typeEarned,
  released: copy.dinero.walletPanel.typeReleased,
  redeemed: copy.dinero.walletPanel.typeRedeemed,
  adjustment: copy.dinero.walletPanel.typeAdjustment,
};

const WALLET_KIND_OPTIONS: { value: "all" | WalletKind; label: string }[] = [
  { value: "all", label: copy.dinero.filterAll },
  { value: "earned", label: WALLET_KIND_LABEL.earned },
  { value: "released", label: WALLET_KIND_LABEL.released },
  { value: "redeemed", label: WALLET_KIND_LABEL.redeemed },
  { value: "adjustment", label: WALLET_KIND_LABEL.adjustment },
];

const SELECT_CLASSES =
  "rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary";

export function DineroView() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("estado");

  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | CommissionStatus>(
    initialStatus && isCommissionStatus(initialStatus) ? initialStatus : "all",
  );

  const [walletStatusFilter, setWalletStatusFilter] = useState<"all" | "available" | "locked">("all");
  const [walletTypeFilter, setWalletTypeFilter] = useState<"all" | WalletKind>("all");
  const [walletPeriodFilter, setWalletPeriodFilter] = useState<string>("all");

  const commissionsQuery = useCommissionsHistory();
  const walletSummaryQuery = useWalletSummary();
  const walletHistoryQuery = useWalletHistory();

  // useMemo (no `?? []` directo) para que la referencia sea estable entre
  // renders — si no, cada memo de abajo la vería como "cambió" cada vez.
  const commissions = useMemo(() => commissionsQuery.data ?? [], [commissionsQuery.data]);

  const statusTotals = useMemo(() => {
    const totals: Record<CommissionStatus, number> = {
      validating: 0,
      trial: 0,
      payable: 0,
      paid: 0,
    };
    for (const row of commissions) {
      if (isCommissionStatus(row.status)) totals[row.status] += row.amount;
    }
    return totals;
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    if (historyStatusFilter === "all") return commissions;
    return commissions.filter((row) => row.status === historyStatusFilter);
  }, [commissions, historyStatusFilter]);

  const walletHistory = useMemo(() => walletHistoryQuery.data ?? [], [walletHistoryQuery.data]);

  const periodOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const row of walletHistory) {
      keys.add(format(parseISO(row.created_at), "yyyy-MM"));
    }
    return Array.from(keys)
      .sort()
      .reverse()
      .map((key) => ({ value: key, label: capitalize(format(parseISO(`${key}-01`), "MMMM yyyy", { locale: es })) }));
  }, [walletHistory]);

  const filteredWallet = useMemo(() => {
    return walletHistory.filter((row) => {
      if (walletStatusFilter !== "all" && row.status !== walletStatusFilter) return false;
      if (walletTypeFilter !== "all" && row.kind !== walletTypeFilter) return false;
      if (walletPeriodFilter !== "all" && format(parseISO(row.created_at), "yyyy-MM") !== walletPeriodFilter) {
        return false;
      }
      return true;
    });
  }, [walletHistory, walletStatusFilter, walletTypeFilter, walletPeriodFilter]);

  const filteredWalletSum = useMemo(
    () => filteredWallet.reduce((sum, row) => sum + row.amount, 0),
    [filteredWallet],
  );

  const historyColumns: DataTableColumn<CommissionRow>[] = [
    { key: "concept", header: copy.dinero.historyPanel.columnConcept, sortable: true },
    {
      key: "status",
      header: copy.dinero.historyPanel.columnStatus,
      render: (row) =>
        isCommissionStatus(row.status) ? (
          <Badge tone={COMMISSION_STATUS_BADGE_TONE[row.status]}>
            {copy.dashboard.commissionStatuses[row.status]}
          </Badge>
        ) : (
          row.status
        ),
    },
    {
      key: "period",
      header: copy.dinero.historyPanel.columnPeriod,
      sortable: true,
      render: (row) => formatPeriod(row.period),
    },
    {
      key: "amount",
      header: copy.dinero.historyPanel.columnAmount,
      sortable: true,
      className: "text-right",
      render: (row) => <MoneyValue amount={row.amount} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.shell.nav.money} />

      {commissionsQuery.isError ? (
        <ErrorBlock title={copy.common.genericErrorTitle} description={copy.common.genericErrorDescription} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMMISSION_STATUSES.map((status) => (
              <StatCard
                key={status}
                label={copy.dashboard.commissionStatuses[status]}
                value={statusTotals[status]}
                format="currency"
                icon={Banknote}
                accent={COMMISSION_STATUS_ACCENT[status]}
                hint={copy.common.historicNote}
                loading={commissionsQuery.isLoading}
              />
            ))}
          </div>

          <p className="text-xs text-text-muted">{copy.dinero.legalNote}</p>

          <Panel title={copy.dinero.historyPanel.title}>
            <div className="mb-4">
              <SegmentedControl
                options={HISTORY_FILTER_OPTIONS}
                value={historyStatusFilter}
                onChange={setHistoryStatusFilter}
              />
            </div>
            <DataTable
              columns={historyColumns}
              rows={filteredCommissions}
              loading={commissionsQuery.isLoading}
              empty={
                <EmptyState
                  icon={Inbox}
                  title={copy.dinero.historyPanel.emptyTitle}
                  description={copy.dinero.historyPanel.emptyDescription}
                />
              }
            />
          </Panel>
        </>
      )}

      <Panel title={copy.dinero.walletPanel.title} icon={Wallet}>
        {walletSummaryQuery.isError || walletHistoryQuery.isError ? (
          <ErrorBlock title={copy.common.genericErrorTitle} description={copy.common.genericErrorDescription} />
        ) : (
          <div className="flex flex-col gap-5">
            {walletSummaryQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.dinero.walletPanel.available}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {walletSummaryQuery.data?.available ?? 0}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    <Lock aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                    {copy.dinero.walletPanel.locked}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {walletSummaryQuery.data?.locked ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.dinero.walletPanel.total}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold text-text-primary">
                    {walletSummaryQuery.data?.total ?? 0}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
              <SegmentedControl
                options={WALLET_STATUS_OPTIONS}
                value={walletStatusFilter}
                onChange={setWalletStatusFilter}
              />
              <label className="flex items-center gap-2 text-sm text-text-muted">
                {copy.dinero.walletPanel.typeLabel}
                <select
                  value={walletTypeFilter}
                  onChange={(event) => setWalletTypeFilter(event.target.value as "all" | WalletKind)}
                  className={SELECT_CLASSES}
                >
                  {WALLET_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-text-muted">
                {copy.dinero.walletPanel.periodLabel}
                <select
                  value={walletPeriodFilter}
                  onChange={(event) => setWalletPeriodFilter(event.target.value)}
                  className={SELECT_CLASSES}
                >
                  <option value="all">{copy.dinero.filterAll}</option>
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {walletHistoryQuery.isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : walletHistory.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title={copy.dinero.walletPanel.emptyTitle}
                description={copy.dinero.walletPanel.emptyDescription}
              />
            ) : filteredWallet.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={copy.dinero.walletPanel.noMatchesTitle}
                description={copy.dinero.walletPanel.noMatchesDescription}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-muted">
                  {copy.dinero.walletPanel.summaryCount(filteredWallet.length)} ·{" "}
                  <MoneyValue amount={filteredWalletSum} signed />
                </p>
                <ul className="flex flex-col divide-y divide-border-subtle">
                  {filteredWallet.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-primary">{row.concept}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
                          <span>{WALLET_KIND_LABEL[row.kind as WalletKind] ?? row.kind}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatShortDate(row.created_at)}</span>
                          {row.status === "locked" && row.unlocks_at ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <Lock aria-hidden="true" className="h-3 w-3" strokeWidth={1.5} />
                              <span>{copy.dinero.walletPanel.unlocksOn(formatShortDate(row.unlocks_at))}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">
                        <MoneyValue amount={row.amount} signed />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
