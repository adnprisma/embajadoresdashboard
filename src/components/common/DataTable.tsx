"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/common/Checkbox";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "./Skeleton";

export type DataTableColumn<T> = {
  key: keyof T;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
};

type SortState<T> = { key: keyof T; direction: "asc" | "desc" } | null;

// Opcional: checkbox por fila + "seleccionar todo lo filtrado" en el
// encabezado. Vive fuera de `columns` porque la casilla del encabezado no
// es una columna con datos — es una acción sobre el conjunto completo de
// `rows` que le pasó el caller (ya filtrado/buscado), no solo lo visible
// en pantalla.
export type DataTableSelection<T> = {
  isSelected: (row: T) => boolean;
  onToggleRow: (row: T) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  getRowLabel?: (row: T) => string;
};

const VIRTUALIZE_THRESHOLD = 100;
// Altura FIJA a propósito, no medida (measureElement) — con `table-fixed` +
// una sola línea por celda (truncate) toda fila mide exactamente esto, así
// que el virtualizador nunca tiene que corregir posiciones a medio scroll.
// Debe coincidir con la clase `h-12` de <tr> en renderRow.
const ROW_HEIGHT = 48;

// <thead> sticky top-0. El destino real de cada fila es un <a> (next/link)
// en la celda principal (primera columna) — así el teclado, el "abrir en
// pestaña nueva", cmd/ctrl+click, etc. funcionan gratis, sin reinventar
// nada. El click en el resto de la fila es solo comodidad de mouse: navega
// al mismo href, pero la fila NO es un tabIndex/rol falso — un lector de
// pantalla la sigue viendo como una fila de tabla normal con un enlace
// adentro, que es justo lo que es.
export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  getRowHref,
  loading = false,
  empty,
  virtualized = false,
  selection,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowHref?: (row: T) => string;
  loading?: boolean;
  empty: ReactNode;
  virtualized?: boolean;
  selection?: DataTableSelection<T>;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState<T>>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { key, direction } = sort;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return direction === "asc" ? result : -result;
    });
    return copy;
  }, [rows, sort]);

  const toggleSort = (key: keyof T) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const shouldVirtualize = virtualized && sortedRows.length > VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? sortedRows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const handleRowClick = (href: string) => (event: MouseEvent<HTMLTableRowElement>) => {
    // El <a> real de la celda principal ya navega solo; si el click vino de
    // ahí (o de cualquier otro control interactivo dentro de la fila), no
    // dupliques la navegación ni le pises el comportamiento nativo (abrir en
    // pestaña nueva, etc.).
    if ((event.target as HTMLElement).closest("a, button")) return;
    router.push(href);
  };

  const renderRow = (row: T) => {
    const href = getRowHref?.(row);

    return (
      <tr
        key={row.id}
        onClick={href ? handleRowClick(href) : undefined}
        className={cn("h-12 border-t border-border-subtle", href && "cursor-pointer hover:bg-bg-sunken")}
      >
        {selection ? (
          <td className="w-10 px-4 py-3">
            <Checkbox
              checked={selection.isSelected(row)}
              onCheckedChange={() => selection.onToggleRow(row)}
              ariaLabel={selection.getRowLabel?.(row) ?? String(row[columns[0]?.key as keyof T] ?? "")}
            />
          </td>
        ) : null}
        {columns.map((column, columnIndex) => {
          const content = column.render ? column.render(row) : String(row[column.key] ?? "");
          const rawValue = String(row[column.key] ?? "");
          const isPrimaryCell = columnIndex === 0 && href;

          return (
            <td
              key={String(column.key)}
              title={rawValue || undefined}
              className={cn("px-4 py-3 text-sm text-text-primary", column.className)}
            >
              {isPrimaryCell ? (
                <Link href={href} className="block truncate font-medium text-text-primary hover:underline">
                  {content}
                </Link>
              ) : (
                <div className="truncate">{content}</div>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
        <table className="w-full table-fixed border-collapse">
          <thead className="bg-bg-sunken">
            <tr>
              {selection ? <th className="w-10 px-4 py-2.5" /> : null}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "truncate px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.06em] text-text-muted",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-border-subtle">
                {selection ? <td className="w-10 px-4 py-3" /> : null}
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn("px-4 py-3", column.className)}>
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (sortedRows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
        {empty}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-[480px] overflow-auto rounded-[var(--radius-card)] border border-border-subtle"
    >
      <table className="w-full table-fixed border-collapse">
        <thead className="sticky top-0 z-10 bg-bg-sunken">
          <tr>
            {selection ? (
              <th className="w-10 px-4 py-2.5">
                <Checkbox
                  checked={selection.allSelected}
                  onCheckedChange={() => selection.onToggleAll()}
                  ariaLabel={copy.common.selectAllLabel}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn(
                  "truncate px-4 py-2.5 text-left text-xs font-medium uppercase tracking-[0.06em] text-text-muted",
                  column.className,
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1 hover:text-text-primary"
                  >
                    {column.header}
                    {sort?.key === column.key ? (
                      sort.direction === "asc" ? (
                        <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shouldVirtualize ? (
            <>
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}
                />
              </tr>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = sortedRows[virtualRow.index];
                return row ? renderRow(row) : null;
              })}
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length + (selection ? 1 : 0)}
                  style={{
                    height:
                      virtualizer.getTotalSize() - (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  }}
                />
              </tr>
            </>
          ) : (
            sortedRows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}
