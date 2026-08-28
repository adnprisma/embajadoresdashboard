"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format } from "date-fns";
import { MoreHorizontal, Trash2, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { ContactCombobox } from "@/components/common/ContactCombobox";
import { copy } from "@/config/copy";
import {
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
  type AppointmentInput,
  type AppointmentRow,
  type AppointmentStatus,
} from "@/lib/queries/appointments";
import type { ContactRow } from "@/lib/queries/contacts";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const formSchema = z
  .object({
    title: z.string().min(1, copy.calendario.dialog.errors.titleRequired),
    date: z.string().min(1),
    start_time: z.string().min(1),
    duration_minutes: z.string().min(1),
    contact_id: z.string().nullable(),
    status: z.enum(["scheduled", "done", "cancelled"]),
  })
  .refine(
    (values) => {
      const startsAt = combineDateTime(values.date, values.start_time);
      const endsAt = new Date(startsAt.getTime() + Number(values.duration_minutes) * 60000);
      return endsAt > startsAt;
    },
    { message: copy.calendario.dialog.errors.endAfterStart, path: ["duration_minutes"] },
  );

type FormValues = z.infer<typeof formSchema>;

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function defaultValuesFor(appointment: AppointmentRow | undefined, defaultDate: Date | undefined): FormValues {
  if (appointment) {
    const startsAt = new Date(appointment.starts_at);
    const endsAt = new Date(appointment.ends_at);
    const durationMinutes = Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000));
    return {
      title: appointment.title,
      date: format(startsAt, "yyyy-MM-dd"),
      start_time: format(startsAt, "HH:mm"),
      duration_minutes: String(durationMinutes),
      contact_id: appointment.contact_id,
      status: (appointment.status as AppointmentStatus) ?? "scheduled",
    };
  }

  const base = defaultDate ?? new Date();
  return {
    title: "",
    date: format(base, "yyyy-MM-dd"),
    start_time: "09:00",
    duration_minutes: "30",
    contact_id: null,
    status: "scheduled",
  };
}

function formValuesToInput(values: FormValues): AppointmentInput {
  const startsAt = combineDateTime(values.date, values.start_time);
  const endsAt = new Date(startsAt.getTime() + Number(values.duration_minutes) * 60000);
  return {
    title: values.title.trim(),
    contact_id: values.contact_id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: values.status,
  };
}

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function EventDialog({
  open,
  onOpenChange,
  mode,
  appointment,
  defaultDate,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  appointment?: AppointmentRow;
  defaultDate?: Date;
  contacts: ContactRow[];
}) {
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment(appointment?.id ?? "");
  const deleteAppointment = useDeleteAppointment();
  const mutation = mode === "create" ? createAppointment : updateAppointment;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => defaultValuesFor(appointment, defaultDate), [appointment, defaultDate]),
  });

  useEffect(() => {
    if (open) {
      reset(defaultValuesFor(appointment, defaultDate));
      setDeleteDialogOpen(false);
    }
    // appointment/defaultDate cambian junto con open — solo importa el
    // valor que tenían AL ABRIR, no reaccionar a cambios mientras está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const durationOptions = useMemo(() => {
    const current = Number(defaultValuesFor(appointment, defaultDate).duration_minutes);
    const set = new Set(DURATION_PRESETS);
    set.add(current);
    return Array.from(set).sort((a, b) => a - b);
  }, [appointment, defaultDate]);

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(formValuesToInput(values));
      onOpenChange(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    try {
      await deleteAppointment.mutateAsync(appointment.id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError); el diálogo se
      // queda abierto para poder reintentar.
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {mode === "create" ? copy.calendario.dialog.createTitle : copy.calendario.dialog.editTitle}
            </Dialog.Title>
            <div className="flex items-center gap-1">
              {mode === "edit" && appointment?.isMine ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      aria-label={copy.calendario.dialog.moreActionsLabel}
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
                    >
                      <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={4}
                      className="z-50 w-52 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
                    >
                      <DropdownMenu.Item
                        onSelect={() => setDeleteDialogOpen(true)}
                        className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                        {copy.calendario.dialog.deleteLabel}
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : null}
              <Dialog.Close
                aria-label={copy.calendario.dialog.cancel}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
              >
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              </Dialog.Close>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-title" className="text-sm font-medium text-text-primary">
                {copy.calendario.dialog.titleLabel}
              </label>
              <input
                id="event-title"
                placeholder={copy.calendario.dialog.titlePlaceholder}
                aria-invalid={errors.title ? "true" : "false"}
                aria-describedby={errors.title ? "event-title-error" : undefined}
                className={INPUT_CLASSES}
                {...register("title")}
              />
              {errors.title ? (
                <p id="event-title-error" className="text-sm text-state-negative">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event-date" className="text-sm font-medium text-text-primary">
                  {copy.calendario.dialog.dateLabel}
                </label>
                <input id="event-date" type="date" className={INPUT_CLASSES} {...register("date")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event-start" className="text-sm font-medium text-text-primary">
                  {copy.calendario.dialog.startTimeLabel}
                </label>
                <input id="event-start" type="time" className={INPUT_CLASSES} {...register("start_time")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event-duration" className="text-sm font-medium text-text-primary">
                  {copy.calendario.dialog.durationLabel}
                </label>
                <select id="event-duration" className={INPUT_CLASSES} {...register("duration_minutes")}>
                  {durationOptions.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {copy.calendario.dialog.durationMinutesLabel(minutes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.duration_minutes ? (
              <p className="text-sm text-state-negative">{errors.duration_minutes.message}</p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-contact" className="text-sm font-medium text-text-primary">
                {copy.calendario.dialog.contactLabel}
              </label>
              <Controller
                name="contact_id"
                control={control}
                render={({ field }) => (
                  <ContactCombobox
                    id="event-contact"
                    contacts={contacts}
                    value={field.value}
                    onChange={(contact) => field.onChange(contact?.id ?? null)}
                  />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-status" className="text-sm font-medium text-text-primary">
                {copy.calendario.dialog.statusLabel}
              </label>
              <select id="event-status" className={INPUT_CLASSES} {...register("status")}>
                <option value="scheduled">{copy.calendario.dialog.statusOptions.scheduled}</option>
                <option value="done">{copy.calendario.dialog.statusOptions.done}</option>
                <option value="cancelled">{copy.calendario.dialog.statusOptions.cancelled}</option>
              </select>
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.calendario.dialog.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? copy.calendario.dialog.submitLoading
                  : mode === "create"
                    ? copy.calendario.dialog.submitCreate
                    : copy.calendario.dialog.submitEdit}
              </button>
            </div>
          </form>

          {appointment ? (
            <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-state-negative-soft"
                    >
                      <TriangleAlert className="h-5 w-5 text-state-negative" strokeWidth={1.5} />
                    </span>
                    <div className="flex-1">
                      <AlertDialog.Title className="text-lg font-semibold text-text-primary">
                        {copy.calendario.dialog.deleteDialogTitle(appointment.title)}
                      </AlertDialog.Title>
                      <AlertDialog.Description className="mt-2 text-sm text-text-secondary">
                        {copy.calendario.dialog.deleteDialogDescription}
                      </AlertDialog.Description>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <AlertDialog.Cancel asChild>
                      <button
                        type="button"
                        className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                      >
                        {copy.calendario.dialog.cancel}
                      </button>
                    </AlertDialog.Cancel>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleteAppointment.isPending}
                      aria-busy={deleteAppointment.isPending}
                      className="flex items-center gap-2 rounded-[var(--radius-control)] bg-state-negative px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
                    >
                      {deleteAppointment.isPending
                        ? copy.calendario.dialog.deleteConfirming
                        : copy.calendario.dialog.deleteConfirm}
                    </button>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
