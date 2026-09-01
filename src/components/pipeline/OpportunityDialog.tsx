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
import { cn } from "@/lib/utils/cn";

const formSchema = z.object({
  business_name: z.string().min(1, copy.pipeline.dialog.errors.businessRequired),
  contact_id: z.string().nullable(),
  estimated_value: z.string().optional(),
  mrr: z.string().optional(),
  stage_id: z.string().min(1),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type LockedContact = { id: string; business_name: string };

function defaultValues(stages: PipelineStage[], lockedContact?: LockedContact): FormValues {
  return {
    business_name: lockedContact?.business_name ?? "",
    contact_id: lockedContact?.id ?? null,
    estimated_value: "",
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
    // Vacío se queda null ("Sin estimar"), nunca se coacciona a 0 — cero es
    // una afirmación, no una ausencia (CLAUDE.md / ver MoneyValue).
    estimated_value: values.estimated_value ? Number(values.estimated_value) : null,
    mrr: values.mrr ? Number(values.mrr) : 0,
    notes: values.notes?.trim() || null,
  };
}

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function OpportunityDialog({
  trigger,
  stages,
  contacts = [],
  lockedContact,
}: {
  trigger: ReactNode;
  stages: PipelineStage[];
  contacts?: ContactRow[];
  // Cuando se abre desde la ficha de un contacto: negocio y contacto ya
  // están decididos por dónde estás parado, así que ni se muestra el
  // combobox ni se deja editar el nombre — cambiarlos ahí solo genera
  // datos inconsistentes con la ficha desde la que se creó.
  lockedContact?: LockedContact;
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
    defaultValues: defaultValues(stages, lockedContact),
  });

  // Al abrir siempre parte de un formulario vacío (o precargado con el
  // contacto fijo) con la primera etapa seleccionada — evita que quede el
  // borrador de un envío anterior.
  useEffect(() => {
    if (open) reset(defaultValues(stages, lockedContact));
  }, [open, stages, lockedContact, reset]);

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
                placeholder={lockedContact ? undefined : copy.pipeline.dialog.businessPlaceholder}
                disabled={Boolean(lockedContact)}
                aria-invalid={errors.business_name ? "true" : "false"}
                aria-describedby={errors.business_name ? "business_name-error" : undefined}
                className={cn(INPUT_CLASSES, lockedContact && "cursor-not-allowed bg-bg-sunken text-text-muted")}
                {...register("business_name")}
              />
              {errors.business_name ? (
                <p id="business_name-error" className="text-sm text-state-negative">
                  {errors.business_name.message}
                </p>
              ) : null}
            </div>

            {lockedContact ? null : (
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
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="estimated_value" className="text-sm font-medium text-text-primary">
                  {copy.pipeline.dialog.estimatedValueLabel}
                </label>
                <input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="0.00"
                  className={INPUT_CLASSES}
                  {...register("estimated_value")}
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
