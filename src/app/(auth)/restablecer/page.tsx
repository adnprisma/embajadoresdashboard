import Link from "next/link";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { RestablecerForm } from "./RestablecerForm";

// El enlace de recuperación de Supabase llega aquí con ?code=... (PKCE).
// Hay que canjearlo por una sesión de recuperación antes de poder llamar
// updateUser({password}). Si ya hay sesión (por ejemplo, el usuario recargó
// la página después de canjear el código una vez), no se vuelve a canjear:
// los códigos son de un solo uso.
export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasSession = Boolean(user);

  if (!hasSession && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    hasSession = !error;
  }

  if (!hasSession) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-semibold text-text-primary">
          {copy.auth.restablecer.invalidLinkTitle}
        </h1>
        <p className="text-sm text-text-secondary">
          {copy.auth.restablecer.invalidLinkDescription}
        </p>
        <Link
          href="/recuperar"
          className="mt-4 text-sm text-accent-text underline-offset-2 hover:underline"
        >
          {copy.auth.restablecer.requestNewLink}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">
          {copy.auth.restablecer.title}
        </h1>
        <p className="text-sm text-text-secondary">{copy.auth.restablecer.description}</p>
      </div>
      <RestablecerForm />
    </div>
  );
}
