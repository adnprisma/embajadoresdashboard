import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

type EmptyStateCta =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

// `illustration` es el slot para las ilustraciones aprobadas del bloque 5+
// (public/illustrations/). Por ahora nadie lo pasa: sin imagen todavía, cae
// al ícono neutro.
export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  illustration,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: EmptyStateCta;
  illustration?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      {illustration ? (
        <div className="mb-1">{illustration}</div>
      ) : (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunken">
          <Icon aria-hidden="true" className="h-6 w-6 text-text-muted" strokeWidth={1.5} />
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {cta ? (
        cta.href ? (
          <Link
            href={cta.href}
            className="mt-2 rounded-[var(--radius-control)] bg-accent px-3 py-1.5 text-sm font-medium text-text-on-coral"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className="mt-2 rounded-[var(--radius-control)] bg-accent px-3 py-1.5 text-sm font-medium text-text-on-coral"
          >
            {cta.label}
          </button>
        )
      ) : null}
    </div>
  );
}
