"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { copy } from "@/config/copy";
import type { AppointmentRow } from "@/lib/queries/appointments";
import { EventChip } from "./EventChip";

function groupByDay(appointments: AppointmentRow[]) {
  const sorted = [...appointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const groups = new Map<string, AppointmentRow[]>();
  for (const appointment of sorted) {
    const key = format(parseISO(appointment.starts_at), "yyyy-MM-dd");
    const list = groups.get(key);
    if (list) list.push(appointment);
    else groups.set(key, [appointment]);
  }
  return groups;
}

export function AgendaView({
  appointments,
  onEventClick,
}: {
  appointments: AppointmentRow[];
  onEventClick: (appointment: AppointmentRow) => void;
}) {
  const groups = groupByDay(appointments);

  if (groups.size === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        illustration={<Illustration name="planear" size="md" />}
        title={copy.calendario.emptyAgendaTitle}
        description={copy.calendario.emptyAgendaDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {Array.from(groups.entries()).map(([key, dayAppointments]) => (
        <div key={key} className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {format(parseISO(`${key}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <div className="flex flex-col gap-1">
            {dayAppointments.map((appointment) => (
              <EventChip key={appointment.id} appointment={appointment} onClick={() => onEventClick(appointment)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
