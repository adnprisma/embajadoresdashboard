import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { ContactosView } from "./ContactosView";

// useSearchParams (para ?vista=) exige un límite de Suspense en build.
export default async function ContactosPage() {
  const profile = await getCurrentProfile();
  return (
    <Suspense fallback={null}>
      <ContactosView isAdmin={profile?.role === "admin"} />
    </Suspense>
  );
}
