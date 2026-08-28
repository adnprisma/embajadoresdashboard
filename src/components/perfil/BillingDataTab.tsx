"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import { useProfile, useUpdateBillingData } from "@/lib/queries/profile";

const formSchema = z.object({
  bank_name: z.string().optional(),
  account_holder: z.string().optional(),
  clabe: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{18}$/.test(value), { message: copy.perfil.billing.clabeError }),
  rfc: z
    .string()
    .optional()
    .refine((value) => !value || /^[A-Za-z0-9]{12,13}$/.test(value), { message: copy.perfil.billing.rfcError }),
  razon_social: z.string().optional(),
  regimen_fiscal: z.string().optional(),
  direccion_fiscal: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  bank_name: "",
  account_holder: "",
  clabe: "",
  rfc: "",
  razon_social: "",
  regimen_fiscal: "",
  direccion_fiscal: "",
};

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function BillingDataTab() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateBillingData = useUpdateBillingData();

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
    if (profile) {
      reset({
        bank_name: profile.bank_data.bank_name ?? "",
        account_holder: profile.bank_data.account_holder ?? "",
        clabe: profile.bank_data.clabe ?? "",
        rfc: profile.tax_data.rfc ?? "",
        razon_social: profile.tax_data.razon_social ?? "",
        regimen_fiscal: profile.tax_data.regimen_fiscal ?? "",
        direccion_fiscal: profile.tax_data.direccion_fiscal ?? "",
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateBillingData.mutateAsync({
        bank_data: {
          bank_name: values.bank_name?.trim() || undefined,
          account_holder: values.account_holder?.trim() || undefined,
          clabe: values.clabe?.trim() || undefined,
        },
        tax_data: {
          rfc: values.rfc?.trim() || undefined,
          razon_social: values.razon_social?.trim() || undefined,
          regimen_fiscal: values.regimen_fiscal?.trim() || undefined,
          direccion_fiscal: values.direccion_fiscal?.trim() || undefined,
        },
      });
      router.refresh();
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  if (isLoading) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-lg flex-col gap-5">
      <p className="text-sm text-text-secondary">{copy.perfil.billing.intro}</p>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{copy.perfil.billing.bankSectionTitle}</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bank_name" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.bankNameLabel}
          </label>
          <input
            id="bank_name"
            placeholder={copy.perfil.billing.bankNamePlaceholder}
            className={INPUT_CLASSES}
            {...register("bank_name")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account_holder" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.accountHolderLabel}
          </label>
          <input
            id="account_holder"
            placeholder={copy.perfil.billing.accountHolderPlaceholder}
            className={INPUT_CLASSES}
            {...register("account_holder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="clabe" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.clabeLabel}
          </label>
          <input
            id="clabe"
            inputMode="numeric"
            placeholder={copy.perfil.billing.clabePlaceholder}
            aria-invalid={errors.clabe ? "true" : "false"}
            aria-describedby={errors.clabe ? "clabe-error" : undefined}
            className={INPUT_CLASSES}
            {...register("clabe")}
          />
          {errors.clabe ? (
            <p id="clabe-error" className="text-sm text-state-negative">
              {errors.clabe.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-text-primary">{copy.perfil.billing.taxSectionTitle}</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rfc" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.rfcLabel}
          </label>
          <input
            id="rfc"
            placeholder={copy.perfil.billing.rfcPlaceholder}
            aria-invalid={errors.rfc ? "true" : "false"}
            aria-describedby={errors.rfc ? "rfc-error" : undefined}
            className={INPUT_CLASSES}
            {...register("rfc")}
          />
          {errors.rfc ? (
            <p id="rfc-error" className="text-sm text-state-negative">
              {errors.rfc.message}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="razon_social" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.razonSocialLabel}
          </label>
          <input
            id="razon_social"
            placeholder={copy.perfil.billing.razonSocialPlaceholder}
            className={INPUT_CLASSES}
            {...register("razon_social")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="regimen_fiscal" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.regimenFiscalLabel}
          </label>
          <input
            id="regimen_fiscal"
            placeholder={copy.perfil.billing.regimenFiscalPlaceholder}
            className={INPUT_CLASSES}
            {...register("regimen_fiscal")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="direccion_fiscal" className="text-sm font-medium text-text-primary">
            {copy.perfil.billing.direccionFiscalLabel}
          </label>
          <textarea
            id="direccion_fiscal"
            rows={2}
            placeholder={copy.perfil.billing.direccionFiscalPlaceholder}
            className={INPUT_CLASSES}
            {...register("direccion_fiscal")}
          />
        </div>
      </div>

      <p className="text-xs text-text-muted">{copy.perfil.billing.requiredHint}</p>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
        >
          {isSubmitting ? copy.perfil.billing.submitLoading : copy.perfil.billing.submit}
        </button>
      </div>
    </form>
  );
}
