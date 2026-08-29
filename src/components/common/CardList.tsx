"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useRef } from "react";

// Contraparte de DataTable para <640px (ver ContactosView/ClientesView):
// misma fuente de datos (`rows`, ya filtrada por el único useMemo de la
// vista), el único cambio es el renderer. No maneja loading/empty — eso
// vive una sola vez en la vista, fuera del split hidden/sm:hidden, para no
// montar el estado vacío (con su <Illustration>) dos veces.
const VIRTUALIZE_THRESHOLD = 100;
const CARD_HEIGHT_ESTIMATE = 132;

export function CardList<T extends { id: string | number }>({
  rows,
  renderCard,
  virtualized = false,
}: {
  rows: T[];
  renderCard: (row: T) => ReactNode;
  virtualized?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = virtualized && rows.length > VIRTUALIZE_THRESHOLD;

  // Altura variable por tarjeta (la línea de "próxima tarea" no siempre
  // está) — measureElement remide cada tarjeta real en vez de confiar en
  // el estimado, así el scroll no salta.
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? rows.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: 6,
  });

  if (!shouldVirtualize) {
    return (
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id}>{renderCard(row)}</div>
        ))}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="max-h-[70vh] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={row.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-3"
            >
              {renderCard(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
