"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import { useProfile, useUpdateOwnPrices } from "@/lib/queries/profile";

// monthly/annual se validan como string (el input nativo entrega texto) y
// se convierten a number solo al enviar — mismo patrón que value/mrr en
// OpportunityDialog, para no pelear con el tipo de entrada/salida de
// z.coerce en el resolver de RHF.
const entrySchema = z.object({
  id: z.string(),
  label: z.string().min(1, copy.perfil.prices.errors.labelRequired),
  monthly: z.string().refine((value) => value === "" || Number(value) >= 0, copy.perfil.prices.errors.negativeNumber),
  annual: z.string().refine((value) => value === "" || Number(value) >= 0, copy.perfil.prices.errors.negativeNumber),
});

const formSchema = z.object({ entries: z.array(entrySchema) });

type FormValues = z.infer<typeof formSchema>;

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

function newEntryId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
}

export function OwnPricesTab() {
  const { data: profile, isLoading } = useProfile();
  const updateOwnPrices = useUpdateOwnPrices();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { entries: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "entries" });

  useEffect(() => {
    if (profile) {
      reset({
        entries: profile.own_prices.entries.map((entry) => ({
          id: entry.id,
          label: entry.label,
          monthly: String(entry.monthly),
          annual: String(entry.annual),
        })),
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateOwnPrices.mutateAsync({
        entries: values.entries.map((entry) => ({
          id: entry.id,
          label: entry.label.trim(),
          monthly: Number(entry.monthly) || 0,
          annual: Number(entry.annual) || 0,
        })),
      });
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-text-secondary">{copy.perfil.prices.intro}</p>

      {fields.length === 0 ? (
        <EmptyState
          icon={Plus}
          illustration={<Illustration name="crear" size="sm" />}
          title={copy.perfil.prices.emptyTitle}
          description={copy.perfil.prices.emptyDescription}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 items-end gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3 sm:grid-cols-[1fr_140px_140px_auto]"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`entries.${index}.label`} className="text-xs font-medium text-text-muted">
                  {copy.perfil.prices.labelLabel}
                </label>
                <input
                  id={`entries.${index}.label`}
                  placeholder={copy.perfil.prices.labelPlaceholder}
                  className={INPUT_CLASSES}
                  {...register(`entries.${index}.label`)}
                />
                {errors.entries?.[index]?.label ? (
                  <p className="text-xs text-state-negative">{errors.entries[index]?.label?.message}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`entries.${index}.monthly`} className="text-xs font-medium text-text-muted">
                  {copy.perfil.prices.monthlyLabel}
                </label>
                <input
                  id={`entries.${index}.monthly`}
                  type="number"
                  step="0.01"
                  min="0"
                  className={INPUT_CLASSES}
                  {...register(`entries.${index}.monthly`)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`entries.${index}.annual`} className="text-xs font-medium text-text-muted">
                  {copy.perfil.prices.annualLabel}
                </label>
                <input
                  id={`entries.${index}.annual`}
                  type="number"
                  step="0.01"
                  min="0"
                  className={INPUT_CLASSES}
                  {...register(`entries.${index}.annual`)}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={copy.perfil.prices.removeRow}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-state-negative transition-colors hover:bg-state-negative-soft"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => append({ id: newEntryId(), label: "", monthly: "0", annual: "0" })}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
        >
          <Plus aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          {copy.perfil.prices.addRow}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
        >
          {isSubmitting ? copy.perfil.prices.submitLoading : copy.perfil.prices.submit}
        </button>
      </div>
    </form>
  );
}
