"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import type { ContactRow } from "@/lib/queries/contacts";
import { useCreateOpportunity, type OpportunityInput, type PipelineStage } from "@/lib/queries/pipeline";
import { ContactCombobox } from "@/components/common/ContactCombobox";

const formSchema = z.object({
  business_name: z.string().min(1, copy.pipeline.dialog.errors.businessRequired),
  contact_id: z.string().nullable(),
  value: z.string().optional(),
  mrr: z.string().optional(),
  stage_id: z.string().min(1),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function defaultValues(stages: PipelineStage[]): FormValues {
  return {
    business_name: "",
    contact_id: null,
    value: "",
    mrr: "",
    stage_id: stages[0]?.id ?? "",
    notes: "",
  };
}

function formValuesToInput(values: FormValues): OpportunityInput {
  return {
    business_name: values.business_name.trim(),
    contact_id: values.contact_id,
    stage_id: values.stage_id,
    value: values.value ? Number(values.value) : 0,
    mrr: values.mrr ? Number(values.mrr) : 0,
    notes: values.notes?.trim() || null,
  };
}

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function OpportunityDialog({
  trigger,
  stages,
  contacts,
}: {
  trigger: ReactNode;
  stages: PipelineStage[];
  contacts: ContactRow[];
}) {
  const [open, setOpen] = useState(false);
  const createOpportunity = useCreateOpportunity();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(stages),
  });

  // Al abrir siempre parte de un formulario vacío con la primera etapa
  // seleccionada — evita que quede el borrador de un envío anterior.
  useEffect(() => {
    if (open) reset(defaultValues(stages));
  }, [open, stages, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createOpportunity.mutateAsync(formValuesToInput(values));
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {copy.pipeline.dialog.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.pipeline.dialog.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="business_name" className="text-sm font-medium text-text-primary">
                {copy.pipeline.dialog.businessLabel}
              </label>
              <input
                id="business_name"
                placeholder={copy.pipeline.dialog.businessPlaceholder}
                aria-invalid={errors.business_name ? "true" : "false"}
                aria-describedby={errors.business_name ? "business_name-error" : undefined}
                className={INPUT_CLASSES}
                {...register("business_name")}
              />
              {errors.business_name ? (
                <p id="business_name-error" className="text-sm text-state-negative">
                  {errors.business_name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="contact_id" className="text-sm font-medium text-text-primary">
                {copy.pipeline.dialog.contactLabel}
              </label>
              <Controller
                name="contact_id"
                control={control}
                render={({ field }) => (
                  <ContactCombobox
                    id="contact_id"
                    contacts={contacts}
                    value={field.value}
                    onChange={(contact) => field.onChange(contact?.id ?? null)}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="value" className="text-sm font-medium text-text-primary">
                  {copy.pipeline.dialog.valueLabel}
                </label>
                <input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={INPUT_CLASSES}
                  {...register("value")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="mrr" className="text-sm font-medium text-text-primary">
                  {copy.pipeline.dialog.mrrLabel}
                </label>
                <input
                  id="mrr"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={INPUT_CLASSES}
                  {...register("mrr")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="stage_id" className="text-sm font-medium text-text-primary">
                {copy.pipeline.dialog.stageLabel}
              </label>
              <select id="stage_id" className={INPUT_CLASSES} {...register("stage_id")}>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-text-primary">
                {copy.pipeline.dialog.notesLabel}
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder={copy.pipeline.dialog.notesPlaceholder}
                className={INPUT_CLASSES}
                {...register("notes")}
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.pipeline.dialog.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting ? copy.pipeline.dialog.submitLoading : copy.pipeline.dialog.submit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
