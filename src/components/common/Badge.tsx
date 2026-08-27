import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Vocabulario (neutral/info/success/warning/danger) alineado con
// resources.badge_tone del esquema (supabase/migrations/0001_schema.sql).
// Por dentro cada tono mapea a los tokens de estado aprobados en
// DESIGN_SYSTEM.md §2 — nunca a un color nuevo.
export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-bg-sunken text-text-secondary",
  info: "bg-state-progress-soft text-state-progress",
  success: "bg-state-positive-soft text-state-positive",
  warning: "bg-state-pending-soft text-state-pending",
  danger: "bg-state-negative-soft text-state-negative",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
