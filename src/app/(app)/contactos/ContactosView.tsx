"use client";

import { format } from "date-fns";
import { AlertTriangle, Download, Plus, Search, Upload, Users } from "lucide-react";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { Badge } from "@/components/common/Badge";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { ContactFormDialog } from "@/components/contactos/ContactFormDialog";
import { ImportDialog } from "@/components/contactos/ImportDialog";
import { copy } from "@/config/copy";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { type ContactRow, useContacts } from "@/lib/queries/contacts";
import { normalizeText } from "@/lib/utils/normalize-text";

const SELECT_CLASSES =
  "rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

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

export function ContactosView() {
  const { data, isLoading, isError, refetch } = useContacts();
  const contacts = useMemo(() => data ?? [], [data]);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");

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

  // Los 3 filtros (búsqueda, giro, etiqueta) combinan en AND, en un solo
  // useMemo — nada de esto pega a la red, todo corre sobre `contacts` ya
  // cargado por completo.
  const filteredContacts = useMemo(() => {
    const normalizedSearch = normalizeText(debouncedSearch.trim());

    return contacts.filter((contact) => {
      if (industryFilter !== "all" && contact.industry !== industryFilter) return false;
      if (tagFilter !== "all" && !contact.tags.includes(tagFilter)) return false;

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
  }, [contacts, industryFilter, tagFilter, debouncedSearch]);

  const hasActiveFilters = searchInput.trim() !== "" || industryFilter !== "all" || tagFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setIndustryFilter("all");
    setTagFilter("all");
  };

  const columns: DataTableColumn<ContactRow>[] = [
    { key: "business_name", header: copy.contactos.fields.business },
    { key: "contact_name", header: copy.contactos.fields.contact },
    { key: "phone", header: copy.contactos.fields.phone },
    { key: "email", header: copy.contactos.fields.email },
    { key: "industry", header: copy.contactos.fields.industry },
    {
      key: "tags",
      header: copy.contactos.fields.tags,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.shell.nav.contacts}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ImportDialog
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
          <div className="flex flex-wrap items-center gap-3">
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
          </div>

          <DataTable
            columns={columns}
            rows={filteredContacts}
            loading={isLoading}
            virtualized
            getRowHref={(row) => `/contactos/${row.id}`}
            empty={
              contacts.length === 0 ? (
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
              )
            }
          />
        </>
      )}
    </div>
  );
}
