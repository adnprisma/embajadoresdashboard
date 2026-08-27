"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z
    .string()
    .min(1, copy.auth.login.errors.emailRequired)
    .email(copy.auth.login.errors.emailInvalid),
  password: z.string().min(8, copy.auth.login.errors.passwordMin),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      // Credenciales inválidas es, con mucho, el caso más común de error aquí.
      // Cualquier otra cosa (rate limit, red) usa el mismo banner: no hay un
      // tercer estado definido en el roadmap para distinguirlos en la UI.
      setFormError(copy.auth.login.credentialsErrorBanner);
      return;
    }

    router.replace(next);
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
        <label htmlFor="email" className="text-sm font-medium text-text-primary">
          {copy.auth.login.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={copy.auth.login.emailPlaceholder}
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

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="password" className="text-sm font-medium text-text-primary">
            {copy.auth.login.passwordLabel}
          </label>
          <Link
            href="/recuperar"
            className="text-sm text-text-secondary underline-offset-2 hover:underline"
          >
            {copy.auth.login.forgotPasswordLink}
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder={copy.auth.login.passwordPlaceholder}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary placeholder:text-text-muted"
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-sm text-state-negative">
            {errors.password.message}
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
        {isSubmitting ? copy.auth.login.submitLoading : copy.auth.login.submit}
      </button>
    </form>
  );
}
