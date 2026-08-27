"use client";

import {
  AlertTriangle,
  Banknote,
  Info,
  Inbox,
  Trophy,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { AlertBanner } from "@/components/common/AlertBanner";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { PageHeader } from "@/components/common/PageHeader";
import { CopyField } from "@/components/common/CopyField";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { MoneyValue } from "@/components/common/MoneyValue";
import { Panel } from "@/components/common/Panel";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Skeleton } from "@/components/common/Skeleton";
import { StatCard, type StatCardAccent } from "@/components/common/StatCard";
import { Stepper } from "@/components/common/Stepper";
import { copy } from "@/config/copy";

const STAT_ACCENTS: StatCardAccent[] = ["primary", "success", "warning", "info", "danger", "neutral"];
const BADGE_TONES: BadgeTone[] = ["neutral", "info", "success", "warning", "danger"];

type DemoRow = { id: string; name: string; status: "success" | "warning" | "danger"; amount: number };

const DEMO_ROWS: DemoRow[] = [
  { id: "1", name: "Cliente 1", status: "success", amount: 4200 },
  { id: "2", name: "Cliente 2", status: "warning", amount: 1850 },
  { id: "3", name: "Cliente 3", status: "success", amount: 3100 },
  { id: "4", name: "Cliente 4", status: "danger", amount: 0 },
  { id: "5", name: "Cliente 5", status: "success", amount: 2650 },
];

const STATUS_TONE: Record<DemoRow["status"], BadgeTone> = {
  success: "success",
  warning: "warning",
  danger: "danger",
};

const DATA_TABLE_COLUMNS: DataTableColumn<DemoRow>[] = [
  { key: "name", header: copy.demo.dataTable.columnName, sortable: true },
  {
    key: "status",
    header: copy.demo.dataTable.columnStatus,
    render: (row) => <Badge tone={STATUS_TONE[row.status]}>{copy.demo.badge[row.status]}</Badge>,
  },
  {
    key: "amount",
    header: copy.demo.dataTable.columnAmount,
    sortable: true,
    className: "text-right",
    render: (row) => <MoneyValue amount={row.amount} />,
  },
];

type DemoState = "normal" | "loading" | "empty" | "error";
const DEMO_STATE_OPTIONS: { value: DemoState; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "loading", label: copy.demo.statCard.loadingLabel },
  { value: "empty", label: copy.demo.dataTable.emptyTitle },
  { value: "error", label: copy.demo.errorState.title },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

export default function DemoPage() {
  const [dataTableState, setDataTableState] = useState<DemoState>("normal");
  const [segment, setSegment] = useState<"week" | "month" | "year">("month");
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col gap-10 pb-16">
      <PageHeader title={copy.demo.pageTitle} description={copy.demo.pageDescription} />

      <Section title={copy.demo.sections.statCard}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAT_ACCENTS.map((accent) => (
            <StatCard
              key={accent}
              label={`${copy.demo.statCard.earned} (${accent})`}
              value={48200}
              format="currency"
              icon={Banknote}
              accent={accent}
              hint={copy.demo.statCard.rankingHint}
            />
          ))}
          <StatCard label={copy.demo.statCard.clients} value={128} icon={Users} accent="info" loading />
          <StatCard label={copy.demo.statCard.ranking} value="#4" icon={Trophy} accent="primary" hint={copy.demo.statCard.rankingHint} href="/ranking" />
        </div>
      </Section>

      <Section title={copy.demo.sections.panel}>
        <Panel
          title={copy.demo.panel.title}
          subtitle={copy.demo.panel.subtitle}
          icon={Trophy}
          action={
            <button type="button" className="text-sm font-medium text-text-primary underline-offset-2 hover:underline">
              {copy.demo.panel.action}
            </button>
          }
        >
          <p className="text-sm text-text-secondary">{copy.demo.panel.body}</p>
        </Panel>
      </Section>

      <Section title={copy.demo.sections.emptyState}>
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
          <EmptyState
            icon={Inbox}
            title={copy.demo.emptyState.title}
            description={copy.demo.emptyState.description}
            cta={{ label: copy.demo.emptyState.cta, onClick: () => setStep(0) }}
          />
        </div>
      </Section>

      <Section title={copy.demo.sections.segmentedControl}>
        <SegmentedControl
          options={[
            { value: "week", label: copy.demo.segmentedControl.week },
            { value: "month", label: copy.demo.segmentedControl.month },
            { value: "year", label: copy.demo.segmentedControl.year },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <p className="text-sm text-text-muted">
          {copy.demo.segmentedControl[segment]}
        </p>
      </Section>

      <Section title={copy.demo.sections.dataTable}>
        <SegmentedControl options={DEMO_STATE_OPTIONS} value={dataTableState} onChange={setDataTableState} />

        {dataTableState === "error" ? (
          <AlertBanner
            tone="warning"
            icon={AlertTriangle}
            title={copy.demo.errorState.title}
            description={copy.demo.errorState.description}
          />
        ) : (
          <DataTable
            columns={DATA_TABLE_COLUMNS}
            rows={dataTableState === "empty" ? [] : DEMO_ROWS}
            loading={dataTableState === "loading"}
            getRowHref={(row) => `/clientes?id=${row.id}`}
            empty={
              <EmptyState
                icon={Inbox}
                title={copy.demo.dataTable.emptyTitle}
                description={copy.demo.dataTable.emptyDescription}
              />
            }
          />
        )}
      </Section>

      <Section title={copy.demo.sections.copyField}>
        <div className="max-w-md">
          <CopyField
            label={copy.demo.copyField.label}
            value="https://app.prisma.mx/r/ABC1234"
            secondaryActions={[
              { label: copy.demo.copyField.secondaryAction, onClick: () => setSegment("month") },
            ]}
          />
        </div>
      </Section>

      <Section title={copy.demo.sections.stepper}>
        <Stepper
          steps={[copy.demo.stepper.step1, copy.demo.stepper.step2, copy.demo.stepper.step3]}
          current={step}
          onStepClick={setStep}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep((value) => Math.min(value + 1, 2))}
            className="rounded-[var(--radius-control)] bg-accent px-3 py-1.5 text-sm font-medium text-text-on-coral"
          >
            {copy.demo.stepper.next}
          </button>
        </div>
      </Section>

      <Section title={copy.demo.sections.alertBanner}>
        <div className="flex flex-col gap-3">
          <AlertBanner
            tone="warning"
            icon={AlertTriangle}
            title={copy.demo.alertBanner.warningTitle}
            description={copy.demo.alertBanner.warningDescription}
            href="/perfil"
          />
          <AlertBanner
            tone="info"
            icon={Info}
            title={copy.demo.alertBanner.infoTitle}
            description={copy.demo.alertBanner.infoDescription}
          />
        </div>
      </Section>

      <Section title={copy.demo.sections.moneyValue}>
        <div className="flex flex-wrap items-center gap-6">
          <MoneyValue amount={12500} />
          <MoneyValue amount={3200} signed />
          <MoneyValue amount={-980} signed />
          <MoneyValue amount={0} signed />
        </div>
      </Section>

      <Section title={copy.demo.sections.badge}>
        <div className="flex flex-wrap gap-2">
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {copy.demo.badge[tone]}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title={copy.demo.sections.skeleton}>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </Section>
    </div>
  );
}
