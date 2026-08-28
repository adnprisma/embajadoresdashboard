"use client";

import { addDays, eachDayOfInterval, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { copy } from "@/config/copy";
import type { AppointmentRow } from "@/lib/queries/appointments";
import { cn } from "@/lib/utils/cn";
import { DayOverflowPopover } from "./DayOverflowPopover";
import { EventChip } from "./EventChip";

const MAX_VISIBLE = 3;

export function MonthGrid({
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
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end: addDays(start, 41) });
  const weekdayLabels = days.slice(0, 7).map((day) => format(day, "EEEEEE", { locale: es }));

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
      <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-sunken">
        {weekdayLabels.map((label, index) => (
          <div
            key={index}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-[0.06em] text-text-muted"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = appointments.filter((appointment) => isSameDay(new Date(appointment.starts_at), day));
          const visible = dayEvents.slice(0, MAX_VISIBLE);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[110px] flex-col gap-1 border-b border-r border-border-subtle p-1.5",
                !inMonth && "bg-bg-base/60",
              )}
            >
              <button
                type="button"
                onClick={() => onDayClick(day)}
                aria-label={format(day, "d 'de' MMMM", { locale: es })}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center self-end rounded-full text-xs font-medium transition-colors hover:bg-bg-sunken",
                  inMonth ? "text-text-primary" : "text-text-muted",
                  today ? "ring-2 ring-accent" : "",
                )}
              >
                {format(day, "d")}
              </button>
              <div className="flex flex-col gap-1">
                {visible.map((appointment) => (
                  <EventChip
                    key={appointment.id}
                    appointment={appointment}
                    onClick={() => onEventClick(appointment)}
                  />
                ))}
              </div>
              {overflow > 0 ? (
                <DayOverflowPopover
                  day={day}
                  events={dayEvents}
                  onEventClick={onEventClick}
                  label={copy.calendario.moreEvents(overflow)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
