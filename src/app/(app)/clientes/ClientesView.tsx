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
import Link from "next/link";
import { useMemo, useState, type ChangeEvent } from "react";
import { Badge, type BadgeTone } from "@/components/common/Badge";
import { CardList } from "@/components/common/CardList";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { StatCard } from "@/components/common/StatCard";
import {
  isModalityAvailableForPackage,
  PAYMENT_MODALITIES,
  PLATFORM_REFERRAL_OWNERS,
  platformLinkKey,
  stripeLinkKey,
  type PaymentModality,
  type PlatformReferralOwner,
} from "@/config/appSettings";
import { copy } from "@/config/copy";
import { useAppSettings, type AppSettingsMap } from "@/lib/queries/appSettings";
import {
  useClientRelatedCounts,
  useClients,
  useDeleteClient,
  useUpdatePaymentModality,
  useUpdatePlatformReferralOwner,
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

// truncate: red de seguridad — si la opción seleccionada incluye el sufijo
// "(disponible pronto)" y queda larga, se corta con elipsis en vez de
// desbordar la celda, incluso con el ancho de columna ya corregido.
const SELECT_CLASSES =
  "w-full truncate rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-2 py-1.5 text-sm text-text-primary disabled:opacity-60";

// Metadato que fija un admin por cliente — mutación directa (no RPC, no es
// dinero calculado) con window.confirm() nativo antes de escribir, mismo
// criterio que useUpdateDailyLeadTarget (profile.ts). "Disponible pronto"
// depende SOLO de que exista una cotización real: sin `latest_quote_package_id`
// no hay llave de Stripe que resolver (stripe_link.<modalidad>.<packageId>
// necesita el id del paquete cotizado), así que no hay nada que anunciar
// como pendiente — ninguna opción lleva sufijo hasta que haya cotización.
function PaymentModalitySelect({ client, settings }: { client: ClientRow; settings: AppSettingsMap }) {
  const updateModality = useUpdatePaymentModality();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const next = (value === "" ? null : (value as PaymentModality)) satisfies PaymentModality | null;
    const label = next ? copy.datosPago.stripe.panelTitle[next] : copy.clientes.paymentModality.unsetOption;
    if (!window.confirm(copy.clientes.paymentModality.confirmMessage(client.name, label))) {
      event.target.value = client.payment_modality ?? "";
      return;
    }
    updateModality.mutate({ clientId: client.id, paymentModality: next });
  };

  // plan-12 solo aplica a Completo (isModalityAvailableForPackage,
  // appSettings.ts) — sin cotización, latest_quote_package_id es null y la
  // función excluye plan-12 sola, sin caso especial aquí.
  const availableModalities = PAYMENT_MODALITIES.filter((modality) =>
    isModalityAvailableForPackage(modality, client.latest_quote_package_id),
  );
  // El valor YA guardado siempre se ofrece, aunque el filtro de arriba lo
  // hubiera excluido para una selección nueva — un <select> cuyo `value`
  // no está entre sus <option> se ve vacío o salta solo a otra opción. No
  // pasa hoy (nada asigna una combinación inválida), pero es la garantía
  // correcta si el paquete cotizado de un cliente cambia después de que ya
  // tenía plan-12 asignado.
  const selectableModalities =
    client.payment_modality && !availableModalities.includes(client.payment_modality)
      ? [...availableModalities, client.payment_modality]
      : availableModalities;

  return (
    <select
      value={client.payment_modality ?? ""}
      onChange={handleChange}
      disabled={updateModality.isPending}
      aria-label={copy.clientes.table.columnPaymentModality}
      className={SELECT_CLASSES}
    >
      <option value="">{copy.clientes.paymentModality.unsetOption}</option>
      {selectableModalities.map((modality) => {
        const pending =
          client.latest_quote_package_id !== null &&
          !settings[stripeLinkKey(modality, client.latest_quote_package_id)];
        return (
          <option key={modality} value={modality}>
            {copy.datosPago.stripe.panelTitle[modality]}
            {pending ? copy.clientes.paymentModality.pendingSuffix : ""}
          </option>
        );
      })}
    </select>
  );
}

// Mismo patrón que PaymentModalitySelect, pero la disponibilidad NUNCA
// depende de una cotización — el link de referido de plataforma no está
// atado a ningún paquete cotizado, solo a si app_settings ya tiene el link
// de ESE dueño cargado (platform_link.<owner>). Por eso "disponible pronto"
// se evalúa siempre, con o sin cotización — a diferencia del de arriba.
function PlatformReferralOwnerSelect({ client, settings }: { client: ClientRow; settings: AppSettingsMap }) {
  const updateOwner = useUpdatePlatformReferralOwner();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const next = (value === "" ? null : (value as PlatformReferralOwner)) satisfies PlatformReferralOwner | null;
    const message = next
      ? copy.clientes.platformReferralOwner.confirmMessage(
          client.name,
          copy.clientes.platformReferralOwner.ownerLabel[next],
        )
      : copy.clientes.platformReferralOwner.confirmMessageUnset(client.name);
    if (!window.confirm(message)) {
      event.target.value = client.platform_referral_owner ?? "";
      return;
    }
    updateOwner.mutate({ clientId: client.id, owner: next });
  };

  return (
    <select
      value={client.platform_referral_owner ?? ""}
      onChange={handleChange}
      disabled={updateOwner.isPending}
      aria-label={copy.clientes.table.columnPlatformReferralOwner}
      className={SELECT_CLASSES}
    >
      <option value="">{copy.clientes.platformReferralOwner.unsetOption}</option>
      {PLATFORM_REFERRAL_OWNERS.map((owner) => {
        const pending = !settings[platformLinkKey(owner)];
        return (
          <option key={owner} value={owner}>
            {copy.clientes.platformReferralOwner.ownerLabel[owner]}
            {pending ? copy.clientes.platformReferralOwner.pendingSuffix : ""}
          </option>
        );
      })}
    </select>
  );
}

// Tarjeta de cliente para <640px. Mismo dato que la fila de la tabla,
// jerarquía distinta — el enlace principal (al contacto vinculado) con
// min-h-11 (44px) de área táctil.
function ClientCard({ client, settings }: { client: ClientRow; settings: AppSettingsMap }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        {client.contact_id ? (
          <Link
            href={`/contactos/${client.contact_id}`}
            className="flex min-h-11 items-center font-semibold text-text-primary hover:underline"
          >
            {client.name}
          </Link>
        ) : (
          <span className="flex min-h-11 items-center font-semibold text-text-primary">{client.name}</span>
        )}
        <ClientActionsMenu client={client} />
      </div>
      <p className="text-sm text-text-secondary">{client.plan || copy.clientes.table.noValue}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_BADGE_TONE[client.status] ?? "neutral"}>{statusLabel(client.status)}</Badge>
        <span className="text-sm font-medium text-text-primary">
          <MoneyValue amount={client.mrr} />
        </span>
      </div>
      {client.next_renewal ? (
        <p className="mt-2 text-xs text-text-muted">
          {copy.clientes.table.columnRenewal}: {formatDate(client.next_renewal)}
        </p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          {copy.clientes.table.columnPaymentModality}
          <PaymentModalitySelect client={client} settings={settings} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          {copy.clientes.table.columnPlatformReferralOwner}
          <PlatformReferralOwnerSelect client={client} settings={settings} />
        </label>
      </div>
    </div>
  );
}

export function ClientesView() {
  const { data, isLoading, isError, refetch } = useClients();
  const clients = useMemo(() => data ?? [], [data]);
  // Vacío mientras carga: los <select> igual funcionan (todo se ve
  // "disponible pronto" un instante), se corrige solo en cuanto resuelve.
  const settingsQuery = useAppSettings();
  const settings = settingsQuery.data ?? {};

  const stats = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "active");
    const mrr = activeClients.reduce((sum, client) => sum + client.mrr, 0);
    const atRisk = activeClients.filter(
      (client) => client.next_renewal && differenceInDays(parseISO(client.next_renewal), new Date()) <= 7,
    ).length;
    const cancelled = clients.filter((client) => client.status === "cancelled").length;

    return { active: activeClients.length, mrr, atRisk, cancelled };
  }, [clients]);

  // Ancho explícito en CADA columna, a propósito — DataTable usa
  // table-fixed + min-w-full: sin un ancho declarado en cada una, el
  // navegador reparte el espacio sobrante de forma impredecible y termina
  // achicando justo las que no lo tienen (pasó con las 8 columnas de esta
  // pantalla, ninguna traía ancho, antes de este cambio). La suma puede
  // superar el contenedor sin problema — el wrapper de DataTable hace
  // scroll horizontal en vez de aplastar el contenido.
  const columns: DataTableColumn<ClientRow>[] = [
    { key: "name", header: copy.clientes.table.columnName, className: "w-48" },
    {
      key: "plan",
      header: copy.clientes.table.columnPlan,
      className: "w-32",
      render: (row) => row.plan || copy.clientes.table.noValue,
    },
    {
      key: "mrr",
      header: copy.clientes.table.columnMrr,
      sortable: true,
      className: "w-28 text-right",
      render: (row) => <MoneyValue amount={row.mrr} />,
    },
    {
      key: "status",
      header: copy.clientes.table.columnStatus,
      className: "w-28",
      render: (row) => <Badge tone={STATUS_BADGE_TONE[row.status] ?? "neutral"}>{statusLabel(row.status)}</Badge>,
    },
    {
      key: "next_renewal",
      header: copy.clientes.table.columnRenewal,
      sortable: true,
      className: "w-36",
      render: (row) => (row.next_renewal ? formatDate(row.next_renewal) : copy.clientes.table.noValue),
    },
    {
      key: "payment_modality",
      header: copy.clientes.table.columnPaymentModality,
      className: "w-52",
      render: (row) => <PaymentModalitySelect client={row} settings={settings} />,
    },
    {
      key: "platform_referral_owner",
      header: copy.clientes.table.columnPlatformReferralOwner,
      className: "w-40",
      render: (row) => <PlatformReferralOwnerSelect client={row} settings={settings} />,
    },
    {
      key: "id",
      header: copy.clientes.table.columnActions,
      className: "w-16 text-right",
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

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
              <EmptyState
                icon={Users}
                illustration={<Illustration name="encontrar" size="lg" />}
                title={copy.clientes.emptyTitle}
                description={copy.clientes.emptyDescription}
              />
            </div>
          ) : (
            <>
              {/* Tabla desde 640px, tarjetas debajo — por CSS, igual que en
                  /contactos (hidden sm:block / sm:hidden), nunca useMediaQuery. */}
              <div className="hidden sm:block">
                <DataTable
                  columns={columns}
                  rows={clients}
                  loading={false}
                  getRowHref={(row) => (row.contact_id ? `/contactos/${row.contact_id}` : "")}
                  empty={null}
                />
              </div>
              <div className="sm:hidden">
                <CardList rows={clients} renderCard={(client) => <ClientCard client={client} settings={settings} />} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
