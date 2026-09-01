import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { getDisplayName } from "@/lib/utils/display-name";
import { DashboardView } from "./DashboardView";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  return (
    <DashboardView
      greetingName={profile ? getDisplayName(profile.full_name, profile.email) : ""}
      billingComplete={profile?.billing_complete ?? true}
      isSeller={profile?.role === "seller"}
    />
  );
}
