"use client";

import { format, parseISO } from "date-fns";
import type { AppointmentRow } from "@/lib/queries/appointments";
import { cn } from "@/lib/utils/cn";

export type EventVisualState = "team" | "upcoming" | "past" | "cancelled";

// El estado visual lo decide la propiedad (¿es mío?), no solo `visibility`:
// un evento propio marcado 'team' sigue siendo editable — ver el comentario
// en appointments.ts sobre appointments_team_select.
export function resolveEventState(appointment: AppointmentRow): EventVisualState {
  if (!appointment.isMine) return "team";
  if (appointment.status === "cancelled") return "cancelled";
  if (new Date(appointment.starts_at).getTime() < Date.now()) return "past";
  return "upcoming";
}

// Cada estado se distingue por más de un canal (relleno vs. borde,
// tachado) — el color nunca es el único portador de la señal
// (DESIGN_SYSTEM.md §4).
const STATE_CLASSES: Record<EventVisualState, string> = {
  team: "bg-bg-sunken text-text-secondary",
  upcoming: "bg-state-progress-soft text-state-progress hover:opacity-80",
  past: "border border-border-subtle bg-bg-surface text-text-muted hover:bg-bg-sunken",
  cancelled: "bg-state-negative-soft text-state-negative line-through hover:opacity-80",
};

const BASE_CLASSES =
  "flex w-full items-center gap-1 truncate rounded-[4px] px-1.5 py-0.5 text-left text-xs font-medium transition-colors";

export function EventChip({ appointment, onClick }: { appointment: AppointmentRow; onClick: () => void }) {
  const state = resolveEventState(appointment);
  const time = format(parseISO(appointment.starts_at), "HH:mm");

  if (state === "team") {
    return (
      <div className={cn(BASE_CLASSES, STATE_CLASSES.team)}>
        <span className="numeric shrink-0">{time}</span>
        <span className="truncate">{appointment.title}</span>
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(BASE_CLASSES, STATE_CLASSES[state])}>
      <span className="numeric shrink-0">{time}</span>
      <span className="truncate">{appointment.title}</span>
    </button>
  );
}
