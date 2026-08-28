import type { ReactNode } from "react";

// Versión mínima y genérica: título + descripción opcional + acción opcional.
// El dashboard (bloque 6) necesita saludo personalizado y chips — cuando
// llegue, decide si extiende este componente o construye el suyo encima.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="line-clamp-2 break-words text-2xl font-semibold text-text-primary">{title}</h1>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
