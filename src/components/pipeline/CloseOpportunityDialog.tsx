"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import type { OpportunityRow } from "@/lib/queries/pipeline";

const formSchema = z.object({
  closed_value: z.string().min(1, copy.pipeline.closeDialog.errors.required),
});

type FormValues = z.infer<typeof formSchema>;

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

// Se abre al mover una oportunidad a una etapa is_won — tanto desde el
// arrastre del kanban (KanbanBoard) como desde "Mover a…" (KanbanCard),
// mismo componente para las dos rutas. Solo junta el número; quien de
// verdad llama al RPC es useUpdateOpportunityStage vía onConfirm — el
// servidor es quien exige este valor (update_opportunity_stage en
// 0016_opportunity_value_split.sql), esto es solo la captura en UI.
export function CloseOpportunityDialog({
  opportunity,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: {
  opportunity: OpportunityRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (closedValue: number) => void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { closed_value: "" },
  });

  useEffect(() => {
    if (open) reset({ closed_value: "" });
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    onConfirm(Number(values.closed_value));
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {opportunity ? copy.pipeline.closeDialog.title(opportunity.business_name) : ""}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.pipeline.closeDialog.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <p className="mb-4 text-sm text-text-secondary">{copy.pipeline.closeDialog.description}</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="closed_value" className="text-sm font-medium text-text-primary">
                {copy.pipeline.closeDialog.closedValueLabel}
              </label>
              <input
                id="closed_value"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                autoFocus
                aria-invalid={errors.closed_value ? "true" : "false"}
                aria-describedby={errors.closed_value ? "closed_value-error" : undefined}
                className={INPUT_CLASSES}
                {...register("closed_value")}
              />
              {errors.closed_value ? (
                <p id="closed_value-error" className="text-sm text-state-negative">
                  {errors.closed_value.message}
                </p>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.pipeline.closeDialog.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting ? copy.pipeline.closeDialog.confirming : copy.pipeline.closeDialog.confirm}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
