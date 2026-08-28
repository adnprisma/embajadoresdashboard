"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Skeleton } from "@/components/common/Skeleton";
import { AgendaView } from "@/components/calendario/AgendaView";
import { EventDialog } from "@/components/calendario/EventDialog";
import { MonthGrid } from "@/components/calendario/MonthGrid";
import { WeekView } from "@/components/calendario/WeekView";
import { copy } from "@/config/copy";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAppointments, type AppointmentRow } from "@/lib/queries/appointments";
import { useContacts } from "@/lib/queries/contacts";

type ViewMode = "month" | "week" | "agenda";

type DialogState = { mode: "create"; defaultDate: Date } | { mode: "edit"; appointment: AppointmentRow } | null;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

const LEGEND_ITEMS: { key: "team" | "upcoming" | "past" | "cancelled"; swatch: string }[] = [
  { key: "team", swatch: "bg-bg-sunken" },
  { key: "upcoming", swatch: "bg-state-progress" },
  { key: "past", swatch: "border border-border-strong bg-bg-surface" },
  { key: "cancelled", swatch: "bg-state-negative" },
];

function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {LEGEND_ITEMS.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.swatch}`} />
          {copy.calendario.legend[item.key]}
        </span>
      ))}
    </div>
  );
}

export function CalendarioView() {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>("month");
  const [dialogState, setDialogState] = useState<DialogState>(null);

  // En <768px la vista por defecto es Agenda — decisión de UNA sola vez al
  // montar, no algo que se re-imponga si el usuario cambia de vista y luego
  // redimensiona la ventana.
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const initializedView = useRef(false);
  useEffect(() => {
    if (!initializedView.current && isDesktop !== undefined) {
      initializedView.current = true;
      if (!isDesktop) setView("agenda");
    }
  }, [isDesktop]);

  // Rango de 42 días de MonthGrid: cubre de sobra cualquier semana o vista
  // de agenda dentro del mismo mes, así que las 3 vistas comparten una sola
  // query por posición del cursor (ver appointmentsKeys.range).
  const rangeStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const rangeEnd = addDays(rangeStart, 41);

  const appointmentsQuery = useAppointments(rangeStart, rangeEnd);
  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);

  const contactsQuery = useContacts();
  const contacts = useMemo(() => contactsQuery.data ?? [], [contactsQuery.data]);

  const goToday = () => setCursor(new Date());
  const goPrev = () => setCursor((current) => (view === "week" ? subWeeks(current, 1) : subMonths(current, 1)));
  const goNext = () => setCursor((current) => (view === "week" ? addWeeks(current, 1) : addMonths(current, 1)));

  const periodLabel =
    view === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – ${format(
          endOfWeek(cursor, { weekStartsOn: 1 }),
          "d MMM yyyy",
          { locale: es },
        )}`
      : capitalize(format(cursor, "MMMM yyyy", { locale: es }));

  const handleDayClick = (day: Date) => setDialogState({ mode: "create", defaultDate: day });
  const handleEventClick = (appointment: AppointmentRow) => setDialogState({ mode: "edit", appointment });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.shell.nav.calendar}
        action={
          <button
            type="button"
            onClick={() => setDialogState({ mode: "create", defaultDate: new Date() })}
            className={PRIMARY_BUTTON_CLASSES}
          >
            <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            {copy.calendario.newAppointment}
          </button>
        }
      />

      <CalendarLegend />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.calendario.today}
          </button>
          <button
            type="button"
            onClick={goPrev}
            aria-label={copy.calendario.previousLabel}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-border-subtle text-text-primary transition-colors hover:bg-bg-sunken"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label={copy.calendario.nextLabel}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-border-subtle text-text-primary transition-colors hover:bg-bg-sunken"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span className="text-sm font-medium text-text-primary">{periodLabel}</span>
        </div>

        <SegmentedControl
          options={[
            { value: "month", label: copy.calendario.views.month },
            { value: "week", label: copy.calendario.views.week },
            { value: "agenda", label: copy.calendario.views.agenda },
          ]}
          value={view}
          onChange={(next) => setView(next as ViewMode)}
        />
      </div>

      {appointmentsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => appointmentsQuery.refetch()}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : appointmentsQuery.isLoading ? (
        <Skeleton className="h-[500px] w-full" />
      ) : view === "month" ? (
        <MonthGrid cursor={cursor} appointments={appointments} onDayClick={handleDayClick} onEventClick={handleEventClick} />
      ) : view === "week" ? (
        <WeekView cursor={cursor} appointments={appointments} onDayClick={handleDayClick} onEventClick={handleEventClick} />
      ) : (
        <AgendaView appointments={appointments} onEventClick={handleEventClick} />
      )}

      <EventDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        mode={dialogState?.mode ?? "create"}
        appointment={dialogState?.mode === "edit" ? dialogState.appointment : undefined}
        defaultDate={dialogState?.mode === "create" ? dialogState.defaultDate : undefined}
        contacts={contacts}
      />
    </div>
  );
}
