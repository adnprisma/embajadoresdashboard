"use client";

import { Illustration } from "@/components/common/Illustration";
import { copy } from "@/config/copy";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-base px-4 text-center">
      <Illustration name="planear" size="lg" className="mb-2" />
      <h1 className="text-2xl font-semibold text-text-primary">
        {copy.appError.title}
      </h1>
      <p className="text-text-secondary">{copy.appError.description}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-text-on-coral"
      >
        {copy.appError.cta}
      </button>
    </main>
  );
}
