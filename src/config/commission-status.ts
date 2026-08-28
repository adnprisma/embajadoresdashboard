import type { BadgeTone } from "@/components/common/Badge";
import type { StatCardAccent } from "@/components/common/StatCard";

export const COMMISSION_STATUSES = ["validating", "trial", "payable", "paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

// Ningún estado de comisión usa accent="primary" (coral): el coral se
// reserva para el único elemento gráfico con peso de cada pantalla, o no
// aparece si no hay ninguno (dashboard: el gráfico; /dinero: nada).
export const COMMISSION_STATUS_ACCENT: Record<CommissionStatus, StatCardAccent> = {
  validating: "warning", // --state-pending
  trial: "info", // --state-progress
  payable: "neutral",
  paid: "success", // --state-positive
};

export const COMMISSION_STATUS_BADGE_TONE: Record<CommissionStatus, BadgeTone> = {
  validating: "warning",
  trial: "info",
  payable: "neutral",
  paid: "success",
};

export const COMMISSION_STATUSES_WITH_ESTIMATE_NOTE: readonly CommissionStatus[] = [
  "validating",
  "trial",
];

export function isCommissionStatus(value: string): value is CommissionStatus {
  return (COMMISSION_STATUSES as readonly string[]).includes(value);
}
