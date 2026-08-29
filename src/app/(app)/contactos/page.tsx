import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { ContactosView } from "./ContactosView";

export default async function ContactosPage() {
  const profile = await getCurrentProfile();
  return <ContactosView isAdmin={profile?.role === "admin"} />;
}
