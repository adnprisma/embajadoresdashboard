"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getRestablecerErrorMessage } from "@/lib/utils/auth-error-message";

const schema = z
  .object({
    password: z.string().min(8, copy.auth.restablecer.errors.passwordMin),
    confirmPassword: z.string().min(1, copy.auth.restablecer.errors.confirmRequired),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: copy.auth.restablecer.errors.passwordsDontMatch,
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

// Medidor de fuerza simple: longitud + variedad de caracteres. 0-4.
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = [
  copy.auth.restablecer.strength.weak,
  copy.auth.restablecer.strength.weak,
  copy.auth.restablecer.strength.fair,
  copy.auth.restablecer.strength.good,
  copy.auth.restablecer.strength.strong,
];

const STRENGTH_TONE = [
  "bg-state-negative",
  "bg-state-negative",
  "bg-state-pending",
  "bg-state-progress",
  "bg-state-positive",
];

export function RestablecerForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch("password") || "";
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      // Aquí ya hay una sesión de recuperación activa — no hay nada que
      // enumerar, así que sí se muestra el motivo real cuando Supabase lo
      // da (contraseña repetida, débil, sesión expirada). Ver
      // auth-error-message.ts.
      const message = getRestablecerErrorMessage(error);
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success(copy.auth.restablecer.successMessage);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-[var(--radius-control)] border border-state-negative bg-state-negative-soft px-3 py-2 text-sm text-state-negative"
        >
          {formError}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-primary">
          {copy.auth.restablecer.passwordLabel}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={
            [errors.password ? "password-error" : null, "password-strength"]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className="rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary"
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-sm text-state-negative">
            {errors.password.message}
          </p>
        ) : null}

        {password ? (
          <div id="password-strength" className="flex flex-col gap-1">
            <div className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < strength ? STRENGTH_TONE[strength] : "bg-border-subtle"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-text-muted">
              {copy.auth.restablecer.strength.label}: {STRENGTH_LABELS[strength]}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
          {copy.auth.restablecer.confirmPasswordLabel}
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? "true" : "false"}
          aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          className="rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p id="confirm-password-error" className="text-sm text-state-negative">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className="mt-2 flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 font-medium text-text-on-coral transition-colors disabled:opacity-60"
      >
        {isSubmitting ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-text-on-coral border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {isSubmitting ? copy.auth.restablecer.submitLoading : copy.auth.restablecer.submit}
      </button>
    </form>
  );
}
