import { LibraryBig } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";
import { RECURSOS } from "@/config/recursos";
import { cn } from "@/lib/utils/cn";

export default function RecursosPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.shell.nav.resources} />

      {RECURSOS.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          illustration={<Illustration name="crear" size="lg" />}
          title={copy.recursos.emptyTitle}
          description={copy.recursos.emptyDescription}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((recurso) => {
            const Icon = recurso.icono;
            return (
              <Link
                key={recurso.slug}
                href={`/recursos/${recurso.slug}`}
                className={cn(
                  "flex flex-col gap-3 rounded-[var(--radius-card)] border p-5 transition-colors",
                  recurso.destacado
                    ? "border-border-accent bg-bg-inverse hover:opacity-90"
                    : "border-border-subtle bg-bg-surface hover:bg-bg-sunken",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-sunken">
                    <Icon aria-hidden="true" className="h-5 w-5 text-text-primary" strokeWidth={1.5} />
                  </span>
                  {/* destacado: SIN badge de tipo a propósito, ver el
                  comentario de `destacado` en config/recursos.ts — dos
                  badges compitiendo se ve mal, y el fondo + contorno ya
                  bastan como señal de jerarquía. El distintivo "Nuevo" de
                  abajo NO pasa por el componente Badge compartido — es un
                  elemento propio de esta tarjeta, a propósito: extender
                  Badge con un tono para fondo oscuro sería construir esa
                  infraestructura para un caso que hoy es único. */}
                  {recurso.destacado ? (
                    <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-accent px-2.5 py-0.5 text-xs font-medium text-text-on-coral">
                      {copy.recursos.newBadge}
                    </span>
                  ) : (
                    <Badge tone="info">{recurso.tipo}</Badge>
                  )}
                </div>
                <div>
                  <p className={cn("font-medium", recurso.destacado ? "text-text-on-dark" : "text-text-primary")}>
                    {recurso.titulo}
                  </p>
                  <p
                    className={cn(
                      "mt-1 line-clamp-1 text-sm",
                      recurso.destacado ? "text-text-on-dark" : "text-text-secondary",
                    )}
                  >
                    {recurso.descripcion}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
