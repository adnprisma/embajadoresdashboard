import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Panel({
  title,
  icon: Icon,
  action,
  subtitle,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          {Icon ? (
            <Icon
              aria-hidden="true"
              className="mt-0.5 h-[18px] w-[18px] shrink-0 text-text-muted"
              strokeWidth={1.5}
            />
          ) : null}
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {subtitle ? <p className="text-sm text-text-secondary">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
