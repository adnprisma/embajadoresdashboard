import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { EquipoView } from "./EquipoView";

// Admin-only, gateado server-side — defensa en profundidad como el resto de
// los grupos protegidos: si alguien sin rol admin llega a /equipo por URL
// directa, se va a /dashboard antes de que el cliente pida ningún dato.
export default async function EquipoPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return <EquipoView />;
}
