import Link from "next/link";
import { Illustration } from "@/components/common/Illustration";
import { copy } from "@/config/copy";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-base px-4 text-center">
      <Illustration name="encontrar" size="lg" className="mb-2" />
      <h1 className="text-2xl font-semibold text-text-primary">
        {copy.notFound.title}
      </h1>
      <p className="text-text-secondary">{copy.notFound.description}</p>
      <Link
        href="/dashboard"
        className="mt-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-text-on-coral"
      >
        {copy.notFound.cta}
      </Link>
    </main>
  );
}
