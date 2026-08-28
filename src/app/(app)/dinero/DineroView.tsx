"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Banknote, Inbox } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { StatCard } from "@/components/common/StatCard";
import {
  COMMISSION_STATUS_ACCENT,
  COMMISSION_STATUS_BADGE_TONE,
  COMMISSION_STATUSES,
  isCommissionStatus,
  type CommissionStatus,
} from "@/config/commission-status";
import { copy } from "@/config/copy";
import { useCommissionsHistory } from "@/lib/queries/wallet";

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

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPeriod(period: string) {
  return capitalize(format(parseISO(period), "MMMM yyyy", { locale: es }));
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

export function DineroView() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("estado");

  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | CommissionStatus>(
    initialStatus && isCommissionStatus(initialStatus) ? initialStatus : "all",
  );

  const commissionsQuery = useCommissionsHistory();

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
                  illustration={<Illustration name="encontrar" size="md" />}
                  title={copy.dinero.historyPanel.emptyTitle}
                  description={copy.dinero.historyPanel.emptyDescription}
                />
              }
            />
          </Panel>
        </>
      )}
    </div>
  );
}
