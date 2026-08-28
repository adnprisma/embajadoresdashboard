// El acento de una etapa (pipeline_stages.accent) codifica su DESENLACE, no
// su identidad — ver context/DESIGN_SYSTEM.md §2 "Acento de etapa en el
// pipeline". Solo existen estos 4 valores; cualquier otro cae en "neutral".
import {
  Archive,
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Search,
  Sparkles,
  TrendingDown,
  Trophy,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { BadgeTone } from "@/components/common/Badge";

export type StageAccent = "neutral" | "pending" | "positive" | "negative";

function isStageAccent(value: string): value is StageAccent {
  return value === "neutral" || value === "pending" || value === "positive" || value === "negative";
}

export function resolveStageAccent(accent: string): StageAccent {
  return isStageAccent(accent) ? accent : "neutral";
}

// `icon` en pipeline_stages es un nombre de lucide-react (ver 0004_seed.sql).
// Circle es el respaldo por si se agrega una etapa con un ícono no mapeado.
const STAGE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  search: Search,
  calendar: Calendar,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  trophy: Trophy,
  "trending-down": TrendingDown,
  clock: Clock,
  archive: Archive,
};

export function resolveStageIcon(icon: string): LucideIcon {
  return STAGE_ICONS[icon] ?? Circle;
}

export const STAGE_ACCENT_BORDER_CLASS: Record<StageAccent, string> = {
  neutral: "border-t-border-strong",
  pending: "border-t-state-pending",
  positive: "border-t-state-positive",
  negative: "border-t-state-negative",
};

export const STAGE_ACCENT_ICON_CLASS: Record<StageAccent, string> = {
  neutral: "text-text-muted",
  pending: "text-state-pending",
  positive: "text-state-positive",
  negative: "text-state-negative",
};

export const STAGE_ACCENT_BADGE_TONE: Record<StageAccent, BadgeTone> = {
  neutral: "neutral",
  pending: "warning",
  positive: "success",
  negative: "danger",
};
