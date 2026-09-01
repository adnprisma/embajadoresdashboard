import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  // El middleware ya protege este grupo; esto es defensa en profundidad
  // (por ejemplo, si algún día cambia el matcher de src/middleware.ts, o si
  // la fila de profiles no se creó todavía).
  if (!profile) {
    redirect("/login");
  }

  return (
    <AppShell
      profile={{
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role === "admin" ? "admin" : "seller",
      }}
    >
      {children}
    </AppShell>
  );
}
