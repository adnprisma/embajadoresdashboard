import { cache } from "react";
import { createClient } from "./server";

// cache() de React deduplica esta consulta dentro de una misma request:
// (app)/layout.tsx (para el Sidebar) y dashboard/page.tsx (saludo +
// facturación) la llaman por separado, pero solo pega a Supabase una vez.
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, plan, status, ref_code, billing_complete, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    ...profile,
    id: user.id,
    email: profile.email || user.email || "",
  };
});
