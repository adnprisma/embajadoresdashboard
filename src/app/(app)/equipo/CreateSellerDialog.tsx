"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import { useCreateSeller } from "@/lib/queries/profile";

const formSchema = z
  .object({
    full_name: z.string().min(1, copy.equipo.createSeller.errors.nameRequired),
    email: z.string().email(copy.equipo.createSeller.errors.emailInvalid),
    password: z.string().min(8, copy.equipo.createSeller.errors.passwordMin),
    confirmPassword: z.string().min(1, copy.equipo.createSeller.errors.confirmRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: copy.equipo.createSeller.errors.passwordsDontMatch,
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = { full_name: "", email: "", password: "", confirmPassword: "" };

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

// Admin-only en la práctica: create-seller (la Edge Function) verifica
// is_admin() del lado del servidor contra el JWT de quien llama, así que
// esta pantalla puede confiar en que /equipo ya está gateada — pero el
// candado real no es este trigger, es ese.
export function CreateSellerDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const createSeller = useCreateSeller();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createSeller.mutateAsync({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        password: values.password,
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {copy.equipo.createSeller.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.pipeline.dialog.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <Dialog.Description className="mb-4 text-sm text-text-secondary">
            {copy.equipo.createSeller.description}
          </Dialog.Description>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className="text-sm font-medium text-text-primary">
                {copy.equipo.createSeller.nameLabel}
              </label>
              <input
                id="full_name"
                autoComplete="name"
                aria-invalid={errors.full_name ? "true" : "false"}
                aria-describedby={errors.full_name ? "full_name-error" : undefined}
                className={INPUT_CLASSES}
                {...register("full_name")}
              />
              {errors.full_name ? (
                <p id="full_name-error" className="text-sm text-state-negative">
                  {errors.full_name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-text-primary">
                {copy.equipo.createSeller.emailLabel}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={INPUT_CLASSES}
                {...register("email")}
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-state-negative">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-text-primary">
                {copy.equipo.createSeller.passwordLabel}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={errors.password ? "password-error" : undefined}
                className={INPUT_CLASSES}
                {...register("password")}
              />
              {errors.password ? (
                <p id="password-error" className="text-sm text-state-negative">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
                {copy.equipo.createSeller.confirmPasswordLabel}
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={errors.confirmPassword ? "true" : "false"}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                className={INPUT_CLASSES}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p id="confirmPassword-error" className="text-sm text-state-negative">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
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
                {isSubmitting ? copy.equipo.createSeller.submitLoading : copy.equipo.createSeller.submit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
