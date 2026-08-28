import { ArrowLeft, Maximize2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { copy } from "@/config/copy";
import { getRecursoBySlug } from "@/config/recursos";

export default async function RecursoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recurso = getRecursoBySlug(slug);

  if (!recurso) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={recurso.titulo}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/recursos"
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.recursos.viewer.back}
            </Link>
            <a
              href={`/api/recursos/${recurso.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
            >
              <Maximize2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.recursos.viewer.fullscreen}
            </a>
          </div>
        }
      />

      <iframe
        src={`/api/recursos/${recurso.slug}`}
        sandbox="allow-scripts allow-same-origin"
        title={copy.recursos.viewer.iframeTitle(recurso.titulo)}
        className="h-[calc(100dvh-220px)] min-h-[500px] w-full rounded-[var(--radius-card)] border border-border-subtle"
      />
    </div>
  );
}
