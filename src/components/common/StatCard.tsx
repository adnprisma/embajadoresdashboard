import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "./Skeleton";

export type StatCardAccent = "primary" | "success" | "warning" | "info" | "danger" | "neutral";
export type StatCardFormat = "currency" | "percent" | "number" | "raw";
export type StatCardSize = "default" | "compact";

const ACCENT_TEXT_CLASSES: Record<StatCardAccent, string> = {
  primary: "text-accent",
  success: "text-state-positive",
  warning: "text-state-pending",
  info: "text-state-progress",
  danger: "text-state-negative",
  neutral: "text-text-muted",
};

const ACCENT_BG_CLASSES: Record<StatCardAccent, string> = {
  primary: "bg-accent-soft",
  success: "bg-state-positive-soft",
  warning: "bg-state-pending-soft",
  info: "bg-state-progress-soft",
  danger: "bg-state-negative-soft",
  neutral: "bg-bg-sunken",
};

// `compact` es para tarjetas que deben leerse como subordinadas de otras
// (ej. los 4 mini-estados de comisión bajo los 4 KPI del dashboard): menos
// padding, ícono e cifra más chicos. La etiqueta se queda igual — 12px ya
// es el mínimo legible (DESIGN_SYSTEM.md §4).
const SIZE_CLASSES = {
  default: {
    card: "gap-3 p-5",
    iconWrapper: "h-10 w-10",
    icon: "h-5 w-5",
    value: "mt-0.5 text-xl",
    chevron: "h-4 w-4",
  },
  compact: {
    card: "gap-2.5 p-3",
    iconWrapper: "h-8 w-8",
    icon: "h-4 w-4",
    value: "mt-0 text-base",
    chevron: "h-3.5 w-3.5",
  },
} satisfies Record<StatCardSize, Record<string, string>>;

// `format` solo aplica cuando `value` es number; si viene como string
// (ej. el "#N" de ranking) se muestra tal cual.
function formatValue(value: string | number, format: StatCardFormat) {
  if (typeof value !== "number") return value;

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
    case "percent":
      return new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 1 }).format(
        value / 100,
      );
    case "number":
      return new Intl.NumberFormat("es-MX").format(value);
    case "raw":
    default:
      return String(value);
  }
}

export function StatCard({
  label,
  value,
  format = "raw",
  icon: Icon,
  accent = "neutral",
  hint,
  href,
  loading = false,
  size = "default",
}: {
  label: string;
  value: string | number;
  format?: StatCardFormat;
  icon: LucideIcon;
  accent?: StatCardAccent;
  hint?: string;
  href?: string;
  loading?: boolean;
  size?: StatCardSize;
}) {
  const sizeClasses = SIZE_CLASSES[size];

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className={cn("flex items-center", sizeClasses.card)}>
          <Skeleton className={cn("shrink-0 rounded-full", sizeClasses.iconWrapper)} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className={size === "compact" ? "h-4 w-16" : "h-6 w-24"} />
          </div>
        </div>
      </div>
    );
  }

  const body = (
    <div
      className={cn(
        "flex items-center rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface shadow-[var(--shadow-card)]",
        sizeClasses.card,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          sizeClasses.iconWrapper,
          ACCENT_BG_CLASSES[accent],
        )}
      >
        <Icon aria-hidden="true" className={cn(sizeClasses.icon, ACCENT_TEXT_CLASSES[accent])} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
          {label}
        </p>
        <p className={cn("numeric truncate font-semibold text-text-primary", sizeClasses.value)}>
          {formatValue(value, format)}
        </p>
        {hint ? <p className="mt-0.5 truncate text-xs text-text-muted">{hint}</p> : null}
      </div>
      {href ? (
        <ChevronRight aria-hidden="true" className={cn("shrink-0 text-text-muted", sizeClasses.chevron)} />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--radius-card)] transition-shadow hover:shadow-[var(--shadow-raised)]"
      >
        {body}
      </Link>
    );
  }

  return body;
}
