"use client";

import * as Popover from "@radix-ui/react-popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { AppointmentRow } from "@/lib/queries/appointments";
import { EventChip } from "./EventChip";

export function DayOverflowPopover({
  day,
  events,
  onEventClick,
  label,
}: {
  day: Date;
  events: AppointmentRow[];
  onEventClick: (appointment: AppointmentRow) => void;
  label: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="rounded-[4px] px-1.5 py-0.5 text-left text-xs font-medium text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
        >
          {label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-64 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-2 shadow-[var(--shadow-raised)]"
        >
          <p className="px-1 pb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {format(day, "d 'de' MMMM", { locale: es })}
          </p>
          <div className="flex flex-col gap-1">
            {events.map((appointment) => (
              <EventChip key={appointment.id} appointment={appointment} onClick={() => onEventClick(appointment)} />
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
