import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { OpportunityDetailView } from "./OpportunityDetailView";

const OPPORTUNITY_SELECT =
  "id, contact_id, business_name, stage_id, estimated_value, closed_value, mrr, position, closed_at, notes, created_at, updated_at, profiles(full_name), contacts(business_name)";

type OpportunityQueryRow = {
  id: string;
  contact_id: string | null;
  business_name: string;
  stage_id: string;
  estimated_value: number | null;
  closed_value: number | null;
  mrr: number;
  position: number;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  contacts: { business_name: string } | { business_name: string }[] | null;
};

// Mismo criterio que /contactos/[id]: RLS ya filtra (no es tuya y no eres
// admin → la fila no aparece), así que "no existe" y "no es tuya" caen en
// el mismo notFound() sin distinguirlas.
export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: opportunity, error }, profile] = await Promise.all([
    supabase.from("opportunities").select(OPPORTUNITY_SELECT).eq("id", id).single(),
    getCurrentProfile(),
  ]);

  if (error || !opportunity) {
    notFound();
  }

  const row = opportunity as unknown as OpportunityQueryRow;
  const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;

  return (
    <OpportunityDetailView
      opportunity={{
        id: row.id,
        contact_id: row.contact_id,
        business_name: row.business_name,
        stage_id: row.stage_id,
        estimated_value: row.estimated_value,
        closed_value: row.closed_value,
        mrr: row.mrr,
        position: row.position,
        closed_at: row.closed_at,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        owner_full_name: owner?.full_name ?? null,
        contact_business_name: contact?.business_name ?? null,
      }}
      isAdmin={profile?.role === "admin"}
    />
  );
}
