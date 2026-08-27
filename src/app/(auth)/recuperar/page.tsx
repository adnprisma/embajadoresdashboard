"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z
    .string()
    .min(1, copy.auth.recuperar.errors.emailRequired)
    .email(copy.auth.recuperar.errors.emailInvalid),
});

type FormValues = z.infer<typeof schema>;

export default function RecuperarPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/restablecer`,
    });

    // Regla dura: nunca reveles si el correo existe. Supabase ya no filtra
    // eso en su respuesta; el único caso que sí vale la pena distinguir es
    // un rate limit real (no depende de si la cuenta existe o no).
    if (error?.status === 429) {
      setFormError(copy.auth.recuperar.genericErrorBanner);
      toast.error(copy.auth.recuperar.genericErrorBanner);
      return;
    }

    setSubmitted(true);
    toast.success(copy.auth.recuperar.successTitle);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          {copy.auth.recuperar.successTitle}
        </h1>
        <p className="text-sm text-text-secondary">{copy.auth.recuperar.successDescription}</p>
        <Link
          href="/login"
          className="mt-4 text-sm text-accent-text underline-offset-2 hover:underline"
        >
          {copy.auth.recuperar.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">{copy.auth.recuperar.title}</h1>
        <p className="text-sm text-text-secondary">{copy.auth.recuperar.description}</p>
      </div>

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
          <label htmlFor="email" className="text-sm font-medium text-text-primary">
            {copy.auth.recuperar.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={copy.auth.recuperar.emailPlaceholder}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted"
            {...register("email")}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-state-negative">
              {errors.email.message}
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
          {isSubmitting ? copy.auth.recuperar.submitLoading : copy.auth.recuperar.submit}
        </button>
      </form>

      <Link
        href="/login"
        className="text-center text-sm text-text-secondary underline-offset-2 hover:underline"
      >
        {copy.auth.recuperar.backToLogin}
      </Link>
    </div>
  );
}
