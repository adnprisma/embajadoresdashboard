"use client";

import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { AppointmentRow } from "@/lib/queries/appointments";
import { cn } from "@/lib/utils/cn";
import { EventChip } from "./EventChip";

export function WeekView({
  cursor,
  appointments,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  appointments: AppointmentRow[];
  onDayClick: (day: Date) => void;
  onEventClick: (appointment: AppointmentRow) => void;
}) {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  const end = endOfWeek(cursor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((day) => {
        const dayEvents = appointments
          .filter((appointment) => isSameDay(new Date(appointment.starts_at), day))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        const today = isToday(day);

        return (
          <div
            key={day.toISOString()}
            className="flex min-h-[160px] flex-col gap-2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-2"
          >
            <button
              type="button"
              onClick={() => onDayClick(day)}
              className="flex items-center justify-between gap-2 rounded-[var(--radius-control)] px-1 py-1 text-left transition-colors hover:bg-bg-sunken"
            >
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                {format(day, "EEE", { locale: es })}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-text-primary",
                  today ? "ring-2 ring-accent" : "",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="flex flex-col gap-1">
              {dayEvents.map((appointment) => (
                <EventChip key={appointment.id} appointment={appointment} onClick={() => onEventClick(appointment)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
