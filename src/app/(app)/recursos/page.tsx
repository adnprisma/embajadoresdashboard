import { LibraryBig } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";
import { RECURSOS } from "@/config/recursos";

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
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5 transition-colors hover:bg-bg-sunken"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-sunken">
                    <Icon aria-hidden="true" className="h-5 w-5 text-text-primary" strokeWidth={1.5} />
                  </span>
                  <Badge tone="info">{recurso.tipo}</Badge>
                </div>
                <div>
                  <p className="font-medium text-text-primary">{recurso.titulo}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{recurso.descripcion}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
