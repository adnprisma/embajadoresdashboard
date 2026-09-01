"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Download, Flame, Phone, Plus, Search, Upload, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { CardList } from "@/components/common/CardList";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Skeleton } from "@/components/common/Skeleton";
import { CapabilityChip, CapabilityIcon, CAPABILITY_ORDER } from "@/components/contactos/CapabilityChip";
import { ContactFormDialog } from "@/components/contactos/ContactFormDialog";
import { ImportDialog } from "@/components/contactos/ImportDialog";
import { ReassignDialog } from "@/components/contactos/ReassignDialog";
import { StatusBadge } from "@/components/contactos/StatusBadge";
import { CONTACT_STATUSES, type ContactStatus } from "@/config/contactStatus";
import { copy } from "@/config/copy";
import type { Capacidad } from "@/config/oferta";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { type ContactRow, useContacts } from "@/lib/queries/contacts";
import { useTeamProfiles } from "@/lib/queries/profile";
import { useAllProspectAnalysis, type ProspectAnalysisRow } from "@/lib/queries/prospectAnalysis";
import { type TaskRow, useTasks } from "@/lib/queries/tasks";
import { normalizeText } from "@/lib/utils/normalize-text";

const SELECT_CLASSES =
  "rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary";

// Tarjeta de contacto para <640px (ver DataTable/CardList más abajo): misma
// fila que la tabla, jerarquía distinta. Enlace principal y teléfono con
// min-h-11 (44px) para área táctil real en móvil.
function ContactCard({
  contact,
  nextTask,
  isAdmin,
}: {
  contact: ContactRow;
  nextTask?: TaskRow;
  isAdmin?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
      <Link
        href={`/contactos/${contact.id}`}
        className="flex min-h-11 items-center font-semibold text-text-primary hover:underline"
      >
        {contact.business_name}
      </Link>
      <StatusBadge status={contact.status} className="mt-0.5" />
      {isAdmin ? (
        <p className="text-sm text-text-secondary">
          {contact.owner_full_name ?? copy.contactos.reassignDialog.currentOwnerNone}
        </p>
      ) : null}
      {contact.contact_name ? <p className="text-sm text-text-secondary">{contact.contact_name}</p> : null}
      {contact.phone ? (
        <a
          href={`tel:${contact.phone}`}
          className="flex min-h-11 items-center gap-2 text-sm text-text-primary"
        >
          <Phone aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {contact.phone}
        </a>
      ) : null}
      {contact.industry || contact.tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {contact.industry ? <Badge tone="neutral">{contact.industry}</Badge> : null}
          {contact.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      {nextTask ? (
        <p className="mt-3 border-t border-border-subtle pt-2 text-xs text-text-muted">
          {copy.contactos.card.nextTask(
            nextTask.title,
            nextTask.due_at ? format(parseISO(nextTask.due_at), "d MMM", { locale: es }) : undefined,
          )}
        </p>
      ) : null}
    </div>
  );
}

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

// ---------------------------------------------------------------
// Vista Comparativa — misma pantalla, mismos filtros, otro renderer. Solo
// incluye contactos con análisis de prospección; el resto se cuenta pero no
// se dibuja (ver `omittedCount` en ContactosView) para no confundir "no
// tiene análisis" con "se perdió".
// ---------------------------------------------------------------

type ComparativaRow = {
  id: string;
  business_name: string;
  address: string | null;
  colonia: string | null;
  score: number | null;
  is_urgent: boolean | null;
  // null = sin dato (gaps vino null o vacío), no "cero carencias". Ver
  // copy.contactos.comparativa.gapsNone — nunca se pinta como 0.
  gapsCount: number | null;
} & Record<Capacidad, boolean | null>;

function toComparativaRow(contact: ContactRow, analysis: ProspectAnalysisRow): ComparativaRow {
  return {
    id: contact.id,
    business_name: contact.business_name,
    address: analysis.address,
    colonia: analysis.colonia,
    score: analysis.score,
    is_urgent: analysis.is_urgent,
    gapsCount: analysis.gaps && analysis.gaps.length > 0 ? analysis.gaps.length : null,
    has_web: analysis.has_web,
    has_whatsapp: analysis.has_whatsapp,
    has_reservas: analysis.has_reservas,
    has_crm: analysis.has_crm,
    has_chat: analysis.has_chat,
    has_blog: analysis.has_blog,
    has_redes: analysis.has_redes,
  };
}

type PriorityTier = "urgent" | "high" | "medium" | "low" | "unscored";

function priorityTier(row: ComparativaRow): PriorityTier {
  if (row.is_urgent) return "urgent";
  if (row.score === null) return "unscored";
  if (row.score >= 9) return "high";
  if (row.score >= 7) return "medium";
  return "low";
}

// Negocio + dirección debajo, en la misma celda — columna primaria
// (multiline: true en DataTable), cada línea trunca por su cuenta.
function NegocioCell({ businessName, address }: { businessName: string; address: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="truncate">{businessName}</span>
      {address ? <span className="truncate text-xs font-normal text-text-secondary">{address}</span> : null}
    </div>
  );
}

// Neutro a propósito (sin color): el peso tipográfico distingue los scores
// altos, el coral queda reservado para la ficha (un solo score por
// pantalla) y para "Nuevo contacto" — ver DESIGN_SYSTEM.md §2.
function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-text-muted">{copy.contactos.comparativa.scoreNone}</span>;
  const weightClass = score >= 9 ? "font-bold text-text-primary" : score >= 7 ? "font-semibold text-text-primary" : "text-text-secondary";
  return <span className={weightClass}>{score}</span>;
}

// Urgente es la ÚNICA prioridad con acento — --state-pending ("requiere
// acción"), nunca coral ni rojo: en este sistema el rojo es desenlace
// negativo, y un urgente es la mejor oportunidad de la lista, no lo
// contrario. Alta/Media/Baja se distinguen solo por peso tipográfico: la
// tabla ya está ordenada por score, un tercer color por fila sería ruido.
function PriorityCell({ row }: { row: ComparativaRow }) {
  const { comparativa, detail } = copy.contactos;
  const tier = priorityTier(row);

  if (tier === "urgent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-state-pending bg-state-pending-soft px-2.5 py-0.5 text-xs font-semibold text-state-pending">
        <Flame aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {detail.analysisTab.urgentBadge}
      </span>
    );
  }

  const label =
    tier === "unscored"
      ? comparativa.scoreNone
      : tier === "high"
        ? comparativa.priorityHigh
        : tier === "medium"
          ? comparativa.priorityMedium
          : comparativa.priorityLow;

  const weightClass =
    tier === "high" ? "font-semibold text-text-primary" : tier === "medium" ? "font-medium text-text-primary" : "text-text-muted";

  return <span className={weightClass}>{label}</span>;
}

// Tarjeta <640px de la Comparativa — mismo dato que la fila de tabla, con
// los chips completos (ícono + texto) en vez de solo el ícono: hay espacio
// vertical de sobra, y repetir la etiqueta ahí no compite por ancho.
function ComparativaCard({ row }: { row: ComparativaRow }) {
  const { comparativa, detail } = copy.contactos;

  return (
    <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/contactos/${row.id}`} className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text-primary hover:underline">{row.business_name}</p>
          {row.address ? <p className="truncate text-sm text-text-secondary">{row.address}</p> : null}
        </Link>
        <ScoreCell score={row.score} />
      </div>
      <p className="mt-1 text-sm text-text-secondary">{row.colonia ?? detail.dataPanel.noValue}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {CAPABILITY_ORDER.map((capacidad) => (
          <CapabilityChip key={capacidad} capacidad={capacidad} value={row[capacidad]} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5 text-sm">
        <span className="text-text-secondary">
          {comparativa.columnGaps}: {row.gapsCount ?? comparativa.gapsNone}
        </span>
        <PriorityCell row={row} />
      </div>
    </div>
  );
}

function exportContactsCsv(rows: ContactRow[]) {
  const csv = Papa.unparse(
    rows.map((row) => ({
      [copy.contactos.fields.business]: row.business_name,
      [copy.contactos.fields.contact]: row.contact_name ?? "",
      [copy.contactos.fields.phone]: row.phone ?? "",
      [copy.contactos.fields.email]: row.email ?? "",
      [copy.contactos.fields.industry]: row.industry ?? "",
      [copy.contactos.fields.tags]: row.tags.join(", "),
    })),
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contactos-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type Vista = "lista" | "comparativa";

export function ContactosView({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data, isLoading, isError, refetch } = useContacts();
  const contacts = useMemo(() => data ?? [], [data]);
  const { data: tasksData } = useTasks();
  const { data: teamData } = useTeamProfiles();
  const sellers = useMemo(() => (teamData ?? []).filter((profile) => profile.role === "seller"), [teamData]);

  // La vista elegida vive en la URL (?vista=), no en la base ni en
  // localStorage — así el enlace se puede compartir tal cual. Se lee una
  // sola vez al montar; después el propio setVista mantiene la URL en
  // sincronía sin recargar la página (router.replace, scroll:false).
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vista, setVistaState] = useState<Vista>(searchParams.get("vista") === "comparativa" ? "comparativa" : "lista");

  const setVista = (next: Vista) => {
    setVistaState(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "lista") params.delete("vista");
    else params.set("vista", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // Solo se pide mientras la Comparativa está abierta — la vista Lista no
  // paga este costo.
  const analysisQuery = useAllProspectAnalysis(vista === "comparativa");

  // Una tarea por contacto: la primera no completada, ya viene ordenada por
  // due_at ascendente (nulls al final) desde useTasks(). Memo aparte del
  // filtro de abajo — no es lógica de filtrado, es un dato extra que solo
  // consume la tarjeta.
  const nextTaskByContact = useMemo(() => {
    const map = new Map<string, TaskRow>();
    for (const task of tasksData ?? []) {
      if (task.done || !task.contact_id || map.has(task.contact_id)) continue;
      map.set(task.contact_id, task);
    }
    return map;
  }, [tasksData]);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContactStatus>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  const industryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const contact of contacts) {
      if (contact.industry) set.add(contact.industry);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [contacts]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const contact of contacts) {
      for (const tag of contact.tags) set.add(tag);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [contacts]);

  // Opciones del filtro "Vendedora" a partir de owner_id/owner_full_name ya
  // presentes en contacts — no de useTeamProfiles(), para no ofrecer una
  // vendedora que hoy no tiene ningún contacto asignado.
  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      map.set(contact.owner_id, contact.owner_full_name ?? copy.contactos.reassignDialog.currentOwnerNone);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [contacts]);

  // Los 5 filtros (búsqueda, giro, etiqueta, vendedora, estado) combinan en
  // AND, en un solo useMemo — nada de esto pega a la red, todo corre sobre
  // `contacts` ya cargado por completo.
  const filteredContacts = useMemo(() => {
    const normalizedSearch = normalizeText(debouncedSearch.trim());

    return contacts.filter((contact) => {
      if (industryFilter !== "all" && contact.industry !== industryFilter) return false;
      if (tagFilter !== "all" && !contact.tags.includes(tagFilter)) return false;
      if (isAdmin && ownerFilter !== "all" && contact.owner_id !== ownerFilter) return false;
      if (statusFilter !== "all" && contact.status !== statusFilter) return false;

      if (normalizedSearch) {
        const haystack = normalizeText(
          [contact.business_name, contact.contact_name, contact.phone, contact.email, contact.notes]
            .filter(Boolean)
            .join(" "),
        );
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [contacts, industryFilter, tagFilter, ownerFilter, statusFilter, isAdmin, debouncedSearch]);

  // Cruza filteredContacts (mismos 4 filtros que la Lista) contra el mapa de
  // análisis, descarta los que no tienen análisis, y ordena: score
  // descendente y, a score igual, más carencias primero. Nulls al final en
  // ambos criterios — "sin score"/"sin dato" no es lo mismo que "el peor".
  const comparativaRows = useMemo(() => {
    const analysisMap = analysisQuery.data;
    if (!analysisMap) return [];

    const rows: ComparativaRow[] = [];
    for (const contact of filteredContacts) {
      const analysis = analysisMap.get(contact.id);
      if (analysis) rows.push(toComparativaRow(contact, analysis));
    }

    rows.sort((a, b) => {
      const scoreDelta = (b.score ?? -1) - (a.score ?? -1);
      if (scoreDelta !== 0) return scoreDelta;
      return (b.gapsCount ?? 0) - (a.gapsCount ?? 0);
    });

    return rows;
  }, [filteredContacts, analysisQuery.data]);

  const omittedCount = filteredContacts.length - comparativaRows.length;

  const comparativaColumns: DataTableColumn<ComparativaRow>[] = [
    {
      key: "business_name",
      header: copy.contactos.fields.business,
      className: "w-64",
      multiline: true,
      render: (row) => <NegocioCell businessName={row.business_name} address={row.address} />,
    },
    {
      key: "score",
      header: copy.contactos.comparativa.columnScore,
      className: "w-20",
      render: (row) => <ScoreCell score={row.score} />,
    },
    {
      key: "colonia",
      header: copy.contactos.comparativa.columnColonia,
      className: "w-32",
      render: (row) => row.colonia ?? copy.contactos.detail.dataPanel.noValue,
    },
    ...CAPABILITY_ORDER.map(
      (capacidad) =>
        ({
          key: capacidad,
          header: copy.contactos.comparativa.capacityHeaders[capacidad],
          className: "w-16 text-center",
          render: (row: ComparativaRow) => <CapabilityIcon capacidad={capacidad} value={row[capacidad]} />,
        }) satisfies DataTableColumn<ComparativaRow>,
    ),
    {
      key: "gapsCount",
      header: copy.contactos.comparativa.columnGaps,
      className: "w-24",
      render: (row) => row.gapsCount ?? copy.contactos.comparativa.gapsNone,
    },
    {
      key: "is_urgent",
      header: copy.contactos.comparativa.columnPriority,
      className: "w-28",
      render: (row) => <PriorityCell row={row} />,
    },
  ];

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    industryFilter !== "all" ||
    tagFilter !== "all" ||
    ownerFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setIndustryFilter("all");
    setTagFilter("all");
    setOwnerFilter("all");
    setStatusFilter("all");
  };

  const selectedContacts = useMemo(
    () => filteredContacts.filter((contact) => selectedIds.has(contact.id)),
    [filteredContacts, selectedIds],
  );

  const toggleRowSelection = (contact: ContactRow) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) next.delete(contact.id);
      else next.add(contact.id);
      return next;
    });
  };

  const allFilteredSelected =
    filteredContacts.length > 0 && filteredContacts.every((contact) => selectedIds.has(contact.id));

  const toggleAllSelection = () => {
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        for (const contact of filteredContacts) next.delete(contact.id);
        return next;
      }
      const next = new Set(prev);
      for (const contact of filteredContacts) next.add(contact.id);
      return next;
    });
  };

  // Anchos fijos a propósito (table-fixed en DataTable): Negocio es el
  // campo que de verdad se lee, así que se lleva el ancho que Contacto y
  // Correo no usan (vacíos en toda la cartera actual). Cada celda es de una
  // sola línea (truncate) — alto de fila fijo, sin medición dinámica.
  const columns: DataTableColumn<ContactRow>[] = [
    { key: "business_name", header: copy.contactos.fields.business, className: "w-72" },
    {
      key: "status",
      header: copy.contactos.fields.status,
      className: "w-36",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "contact_name", header: copy.contactos.fields.contact, className: "w-28" },
    { key: "phone", header: copy.contactos.fields.phone, className: "w-32" },
    { key: "email", header: copy.contactos.fields.email, className: "w-28" },
    { key: "industry", header: copy.contactos.fields.industry, className: "w-32" },
    {
      key: "tags",
      header: copy.contactos.fields.tags,
      render: (row) => (
        <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
          {row.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: "owner_full_name",
            header: copy.contactos.fields.owner,
            className: "w-36",
            render: (row: ContactRow) => row.owner_full_name ?? copy.contactos.reassignDialog.currentOwnerNone,
          } satisfies DataTableColumn<ContactRow>,
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.shell.nav.contacts}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportDialog
              isAdmin={isAdmin}
              trigger={
                <button type="button" className={SECONDARY_BUTTON_CLASSES}>
                  <Upload aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  {copy.contactos.actions.import}
                </button>
              }
            />
            <button
              type="button"
              onClick={() => exportContactsCsv(filteredContacts)}
              disabled={filteredContacts.length === 0}
              className={SECONDARY_BUTTON_CLASSES}
            >
              <Download aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.contactos.actions.export}
            </button>
            <ContactFormDialog
              mode="create"
              trigger={
                <button type="button" className={PRIMARY_BUTTON_CLASSES}>
                  <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  {copy.contactos.actions.newContact}
                </button>
              }
            />
          </div>
        }
      />

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
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[240px] flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                strokeWidth={1.5}
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={copy.contactos.filters.searchPlaceholder}
                aria-label={copy.contactos.filters.searchLabel}
                className="w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <select
              value={industryFilter}
              onChange={(event) => setIndustryFilter(event.target.value)}
              aria-label={copy.contactos.filters.industryLabel}
              className={SELECT_CLASSES}
            >
              <option value="all">{copy.contactos.filters.industryAll}</option>
              {industryOptions.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              aria-label={copy.contactos.filters.tagLabel}
              className={SELECT_CLASSES}
            >
              <option value="all">{copy.contactos.filters.tagAll}</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | ContactStatus)}
              aria-label={copy.contactos.filters.statusLabel}
              className={SELECT_CLASSES}
            >
              <option value="all">{copy.contactos.filters.statusAll}</option>
              {CONTACT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {copy.contactos.status.labels[status]}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                aria-label={copy.contactos.filters.ownerLabel}
                className={SELECT_CLASSES}
              >
                <option value="all">{copy.contactos.filters.ownerAll}</option>
                {ownerOptions.map(([ownerId, ownerName]) => (
                  <option key={ownerId} value={ownerId}>
                    {ownerName}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <SegmentedControl
            value={vista}
            onChange={setVista}
            options={[
              { value: "lista", label: copy.contactos.comparativa.viewLista },
              { value: "comparativa", label: copy.contactos.comparativa.viewComparativa },
            ]}
          />

          {isAdmin && vista === "lista" && selectedContacts.length > 0 ? (
            <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-border-subtle bg-bg-sunken px-4 py-2.5">
              <p className="text-sm font-medium text-text-primary">
                {copy.contactos.selection.count(selectedContacts.length)}
              </p>
              <button
                type="button"
                onClick={() => setReassignDialogOpen(true)}
                className={PRIMARY_BUTTON_CLASSES}
              >
                {copy.contactos.selection.reassign}
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
              {contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  illustration={<Illustration name="encontrar" size="lg" />}
                  title={copy.contactos.emptyTitle}
                  description={copy.contactos.emptyDescription}
                />
              ) : (
                <EmptyState
                  icon={Search}
                  illustration={<Illustration name="encontrar" size="lg" />}
                  title={copy.contactos.noMatchesTitle}
                  description={copy.contactos.noMatchesDescription}
                  cta={hasActiveFilters ? { label: copy.contactos.filters.clearFilters, onClick: clearFilters } : undefined}
                />
              )}
            </div>
          ) : vista === "lista" ? (
            <>
              {/* Tabla desde 640px, tarjetas debajo — decisión por CSS
                  (hidden sm:block / sm:hidden), nunca useMediaQuery: ambos
                  renderers montan siempre, así que no hay parpadeo de
                  hidratación ni salto de layout cuando el viewport real no
                  coincide con el que adivinó el server. */}
              <div className="hidden sm:block">
                <DataTable
                  columns={columns}
                  rows={filteredContacts}
                  loading={false}
                  virtualized
                  getRowHref={(row) => `/contactos/${row.id}`}
                  empty={null}
                  selection={
                    isAdmin
                      ? {
                          isSelected: (row) => selectedIds.has(row.id),
                          onToggleRow: toggleRowSelection,
                          onToggleAll: toggleAllSelection,
                          allSelected: allFilteredSelected,
                          getRowLabel: (row) => copy.contactos.selection.rowLabel(row.business_name),
                        }
                      : undefined
                  }
                />
              </div>
              <div className="sm:hidden">
                <CardList
                  rows={filteredContacts}
                  virtualized
                  renderCard={(contact) => (
                    <ContactCard contact={contact} nextTask={nextTaskByContact.get(contact.id)} isAdmin={isAdmin} />
                  )}
                />
              </div>
            </>
          ) : analysisQuery.isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : comparativaRows.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
              <EmptyState
                icon={Search}
                illustration={<Illustration name="encontrar" size="lg" />}
                title={copy.contactos.comparativa.noAnalysisTitle}
                description={copy.contactos.comparativa.noAnalysisDescription}
              />
            </div>
          ) : (
            <>
              {omittedCount > 0 ? (
                <p className="text-xs text-text-muted">{copy.contactos.comparativa.omittedNote(omittedCount)}</p>
              ) : null}
              <div className="hidden sm:block">
                <DataTable
                  columns={comparativaColumns}
                  rows={comparativaRows}
                  loading={false}
                  virtualized
                  rowHeight={64}
                  getRowHref={(row) => `/contactos/${row.id}`}
                  empty={null}
                />
              </div>
              <div className="sm:hidden">
                <CardList
                  rows={comparativaRows}
                  virtualized
                  renderCard={(row) => <ComparativaCard row={row} />}
                />
              </div>
            </>
          )}
        </>
      )}

      {isAdmin ? (
        <ReassignDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          contacts={selectedContacts}
          sellers={sellers}
          onReassigned={() => setSelectedIds(new Set())}
        />
      ) : null}
    </div>
  );
}
