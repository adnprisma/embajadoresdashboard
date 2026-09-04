"use client";

import { Activity, AlertTriangle, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { CONTACT_STATUSES, FUNNEL_STATUSES, type ContactStatus } from "@/config/contactStatus";
import { copy } from "@/config/copy";
import { useContacts } from "@/lib/queries/contacts";
import { useTeamProfiles, useUpdateDailyLeadTarget, type TeamProfileRow } from "@/lib/queries/profile";
import { useWeeklyStatusFunnel, type WeeklyStatusFunnelRow } from "@/lib/queries/weeklyStatusFunnel";

const DAILY_LEAD_TARGET_MIN = 1;
const DAILY_LEAD_TARGET_MAX = 50;

// Guarda al salir del campo, solo si el valor cambió y es válido — el
// check (daily_lead_target between 1 and 50) de 0025_daily_lead_target.sql
// es la última red, esto evita mandarle un valor fuera de rango de entrada.
function DailyTargetCell({ seller }: { seller: TeamProfileRow }) {
  const [value, setValue] = useState(String(seller.daily_lead_target));
  const updateTarget = useUpdateDailyLeadTarget();

  const commit = () => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < DAILY_LEAD_TARGET_MIN || parsed > DAILY_LEAD_TARGET_MAX) {
      setValue(String(seller.daily_lead_target));
      return;
    }
    if (parsed === seller.daily_lead_target) return;
    updateTarget.mutate({ sellerId: seller.id, dailyLeadTarget: parsed });
  };

  return (
    <input
      type="number"
      min={DAILY_LEAD_TARGET_MIN}
      max={DAILY_LEAD_TARGET_MAX}
      step={1}
      value={value}
      aria-label={copy.equipo.dailyTarget.inputLabel(seller.full_name)}
      disabled={updateTarget.isPending}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      className="numeric w-16 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-2 py-1 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
    />
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
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

// owner_id -> status -> conteo. Misma forma para el embudo (semanas) y la
// foto del universo (contactos actuales) — ambos son "cuenta esto agrupado
// por vendedora y por estado", solo cambia de dónde sale la fila.
function groupByOwnerAndStatus(rows: { owner_id: string; status: ContactStatus }[]) {
  const map = new Map<string, Map<ContactStatus, number>>();
  for (const row of rows) {
    if (!map.has(row.owner_id)) map.set(row.owner_id, new Map());
    const ownerMap = map.get(row.owner_id) as Map<ContactStatus, number>;
    ownerMap.set(row.status, (ownerMap.get(row.status) ?? 0) + 1);
  }
  return map;
}

function funnelRowsToGroups(rows: WeeklyStatusFunnelRow[]) {
  const map = new Map<string, Map<ContactStatus, number>>();
  for (const row of rows) {
    if (!map.has(row.owner_id)) map.set(row.owner_id, new Map());
    (map.get(row.owner_id) as Map<ContactStatus, number>).set(row.to_status, row.contact_count);
  }
  return map;
}

// Pantalla admin-only (bloque 3) — gateada server-side en page.tsx. Dos
// secciones separadas a propósito (embudo semanal vs. foto del universo):
// una dice qué se hizo esta semana, la otra cuánto queda por trabajar. Sin
// ranking, sin porcentajes, sin color de semáforo — vendedoras una al lado
// de la otra, mismos números para todas.
export function EquipoView() {
  const teamQuery = useTeamProfiles();
  const contactsQuery = useContacts();
  const currentWeekQuery = useWeeklyStatusFunnel(0);
  const previousWeekQuery = useWeeklyStatusFunnel(1);

  const sellers = useMemo(
    () => (teamQuery.data ?? []).filter((profile) => profile.role === "seller"),
    [teamQuery.data],
  );

  const currentByOwner = useMemo(() => funnelRowsToGroups(currentWeekQuery.data ?? []), [currentWeekQuery.data]);
  const previousByOwner = useMemo(() => funnelRowsToGroups(previousWeekQuery.data ?? []), [previousWeekQuery.data]);

  const snapshotByOwner = useMemo(
    () => groupByOwnerAndStatus(contactsQuery.data ?? []),
    [contactsQuery.data],
  );

  const funnelLoading = teamQuery.isLoading || currentWeekQuery.isLoading || previousWeekQuery.isLoading;
  const funnelError = teamQuery.isError || currentWeekQuery.isError || previousWeekQuery.isError;
  const funnelHasMovement =
    (currentWeekQuery.data ?? []).length > 0 || (previousWeekQuery.data ?? []).length > 0;

  const snapshotLoading = teamQuery.isLoading || contactsQuery.isLoading;
  const snapshotError = teamQuery.isError || contactsQuery.isError;

  // Aparte de la tabla por vendedora: no es desempeño de nadie, es
  // inventario del negocio por repartir (ver 0021_contact_reserve_and_tags.sql).
  const reserveCount = (contactsQuery.data ?? []).filter((contact) => contact.in_reserve).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.equipo.title} />

      <Panel title={copy.equipo.funnel.title} subtitle={copy.equipo.funnel.subtitle}>
        {funnelError ? (
          <ErrorBlock
            onRetry={() => {
              teamQuery.refetch();
              currentWeekQuery.refetch();
              previousWeekQuery.refetch();
            }}
          />
        ) : funnelLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !funnelHasMovement ? (
          <EmptyState
            icon={Activity}
            illustration={<Illustration name="encontrar" size="sm" />}
            title={copy.equipo.funnel.emptyTitle}
            description={copy.equipo.funnel.emptyDescription}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                  <th className="py-2 pr-4">{copy.equipo.funnel.columnSeller}</th>
                  {FUNNEL_STATUSES.map((status) => (
                    <th key={status} className="py-2 pr-4">
                      {copy.contactos.status.labels[status]}
                    </th>
                  ))}
                  <th className="py-2 pr-4">{copy.equipo.dailyTarget.columnLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sellers.map((seller) => (
                  <tr key={seller.id}>
                    <td className="py-2 pr-4 font-medium text-text-primary">{seller.full_name}</td>
                    {FUNNEL_STATUSES.map((status) => {
                      const current = currentByOwner.get(seller.id)?.get(status) ?? 0;
                      const previous = previousByOwner.get(seller.id)?.get(status) ?? 0;
                      return (
                        <td key={status} className="py-2 pr-4">
                          <span className="numeric text-text-primary">{current}</span>{" "}
                          <span className="numeric text-xs text-text-muted">
                            ({copy.equipo.funnel.previousWeekLabel}: {previous})
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2 pr-4">
                      <DailyTargetCell seller={seller} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={copy.equipo.snapshot.title} subtitle={copy.equipo.snapshot.subtitle}>
        {snapshotError ? (
          <ErrorBlock onRetry={() => contactsQuery.refetch()} />
        ) : snapshotLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : sellers.length === 0 ? (
          <EmptyState
            icon={Users}
            illustration={<Illustration name="encontrar" size="sm" />}
            title={copy.equipo.snapshot.emptyTitle}
            description={copy.equipo.snapshot.emptyDescription}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                  <th className="py-2 pr-4">{copy.equipo.funnel.columnSeller}</th>
                  {CONTACT_STATUSES.map((status) => (
                    <th key={status} className="py-2 pr-4">
                      {copy.contactos.status.labels[status]}
                    </th>
                  ))}
                  <th className="py-2 pr-4">{copy.equipo.snapshot.columnTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sellers.map((seller) => {
                  const ownerMap = snapshotByOwner.get(seller.id);
                  const total = ownerMap ? [...ownerMap.values()].reduce((sum, n) => sum + n, 0) : 0;
                  return (
                    <tr key={seller.id}>
                      <td className="py-2 pr-4 font-medium text-text-primary">{seller.full_name}</td>
                      {CONTACT_STATUSES.map((status) => (
                        <td key={status} className="numeric py-2 pr-4 text-text-primary">
                          {ownerMap?.get(status) ?? 0}
                        </td>
                      ))}
                      <td className="numeric py-2 pr-4 font-medium text-text-primary">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!snapshotError && !snapshotLoading && reserveCount > 0 ? (
          <p className="mt-4 border-t border-border-subtle pt-3 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{copy.equipo.snapshot.reserveStat(reserveCount)}</span>{" "}
            · {copy.equipo.snapshot.reserveStatDescription}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
