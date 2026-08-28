"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { differenceInDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  TriangleAlert,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { copy } from "@/config/copy";
import {
  useClientRelatedCounts,
  useClients,
  useDeleteClient,
  type ClientRow,
} from "@/lib/queries/clients";

const STATUS_BADGE_TONE: Record<string, BadgeTone> = {
  active: "success",
  at_risk: "warning",
  cancelled: "danger",
};

function statusLabel(status: string) {
  if (status === "active" || status === "at_risk" || status === "cancelled") {
    return copy.clientes.status[status];
  }
  return status;
}

function formatDate(date: string) {
  return format(parseISO(date), "d MMM yyyy", { locale: es });
}

function ClientActionsMenu({ client }: { client: ClientRow }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const relatedCounts = useClientRelatedCounts(client.id, deleteDialogOpen);
  const deleteClient = useDeleteClient();

  const keepText =
    relatedCounts.data && relatedCounts.data.commissions > 0
      ? copy.clientes.deleteDialog.keepNotice(copy.clientes.deleteDialog.commissionUnit(relatedCounts.data.commissions))
      : copy.clientes.deleteDialog.keepNone;

  const handleDelete = async () => {
    try {
      await deleteClient.mutateAsync(client.id);
      setDeleteDialogOpen(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={copy.clientes.moreActionsLabel}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
          >
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 w-52 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
          >
            <DropdownMenu.Item
              onSelect={() => setDeleteDialogOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.clientes.deleteLabel}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

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
                  {copy.clientes.deleteDialog.title(client.name)}
                </AlertDialog.Title>
                <AlertDialog.Description asChild>
                  <div className="mt-2 flex flex-col gap-2 text-sm text-text-secondary">
                    <p>{copy.clientes.deleteDialog.intro(client.name)}</p>
                    <p>{relatedCounts.isLoading ? copy.clientes.deleteDialog.loadingImpact : keepText}</p>
                  </div>
                </AlertDialog.Description>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  {copy.clientes.deleteDialog.cancel}
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteClient.isPending}
                aria-busy={deleteClient.isPending}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-state-negative px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {deleteClient.isPending ? copy.clientes.deleteDialog.confirming : copy.clientes.deleteDialog.confirm}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

export function ClientesView() {
  const { data, isLoading, isError, refetch } = useClients();
  const clients = useMemo(() => data ?? [], [data]);

  const stats = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "active");
    const mrr = activeClients.reduce((sum, client) => sum + client.mrr, 0);
    const atRisk = activeClients.filter(
      (client) => client.next_renewal && differenceInDays(parseISO(client.next_renewal), new Date()) <= 7,
    ).length;
    const cancelled = clients.filter((client) => client.status === "cancelled").length;

    return { active: activeClients.length, mrr, atRisk, cancelled };
  }, [clients]);

  const columns: DataTableColumn<ClientRow>[] = [
    { key: "name", header: copy.clientes.table.columnName },
    {
      key: "plan",
      header: copy.clientes.table.columnPlan,
      render: (row) => row.plan || copy.clientes.table.noValue,
    },
    {
      key: "mrr",
      header: copy.clientes.table.columnMrr,
      sortable: true,
      className: "text-right",
      render: (row) => <MoneyValue amount={row.mrr} />,
    },
    {
      key: "status",
      header: copy.clientes.table.columnStatus,
      render: (row) => <Badge tone={STATUS_BADGE_TONE[row.status] ?? "neutral"}>{statusLabel(row.status)}</Badge>,
    },
    {
      key: "next_renewal",
      header: copy.clientes.table.columnRenewal,
      sortable: true,
      render: (row) => (row.next_renewal ? formatDate(row.next_renewal) : copy.clientes.table.noValue),
    },
    {
      key: "id",
      header: copy.clientes.table.columnActions,
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end">
          <ClientActionsMenu client={row} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.shell.nav.clients} />

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
              label={copy.clientes.stats.active}
              value={stats.active}
              format="number"
              icon={Users}
              accent="neutral"
              loading={isLoading}
            />
            <StatCard
              label={copy.clientes.stats.mrr}
              value={stats.mrr}
              format="currency"
              icon={Wallet}
              accent="neutral"
              loading={isLoading}
            />
            <StatCard
              label={copy.clientes.stats.atRisk}
              value={stats.atRisk}
              format="number"
              icon={AlertTriangle}
              accent="warning"
              loading={isLoading}
            />
            <StatCard
              label={copy.clientes.stats.cancelled}
              value={stats.cancelled}
              format="number"
              icon={XCircle}
              accent="danger"
              loading={isLoading}
            />
          </div>

          <DataTable
            columns={columns}
            rows={clients}
            loading={isLoading}
            getRowHref={(row) => (row.contact_id ? `/contactos/${row.contact_id}` : "")}
            empty={
              <EmptyState
                icon={Users}
                illustration={<Illustration name="encontrar" size="lg" />}
                title={copy.clientes.emptyTitle}
                description={copy.clientes.emptyDescription}
              />
            }
          />
        </>
      )}
    </div>
  );
}
