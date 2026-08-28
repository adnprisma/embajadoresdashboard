"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import { useCreateTask } from "@/lib/queries/tasks";

const formSchema = z.object({
  title: z.string().min(1, copy.tareas.dialog.errors.titleRequired),
  due_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = { title: "", due_at: "" };

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function TaskDialog({ contactId, trigger }: { contactId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTask();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({
        contact_id: contactId,
        title: values.title.trim(),
        due_at: values.due_at ? new Date(`${values.due_at}T00:00:00`).toISOString() : null,
      });
      setOpen(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {copy.tareas.dialog.createTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.tareas.dialog.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-title" className="text-sm font-medium text-text-primary">
                {copy.tareas.dialog.titleLabel}
              </label>
              <input
                id="task-title"
                placeholder={copy.tareas.dialog.titlePlaceholder}
                aria-invalid={errors.title ? "true" : "false"}
                aria-describedby={errors.title ? "task-title-error" : undefined}
                className={INPUT_CLASSES}
                {...register("title")}
              />
              {errors.title ? (
                <p id="task-title-error" className="text-sm text-state-negative">
                  {errors.title.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="task-due" className="text-sm font-medium text-text-primary">
                {copy.tareas.dialog.dueLabel}
              </label>
              <input id="task-due" type="date" className={INPUT_CLASSES} {...register("due_at")} />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.tareas.dialog.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting ? copy.tareas.dialog.submitLoading : copy.tareas.dialog.submit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
