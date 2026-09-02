import { notFound } from "next/navigation";
import type { ContactStatus } from "@/config/contactStatus";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";
import { ContactDetailView } from "./ContactDetailView";

const CONTACT_SELECT =
  "id, owner_id, business_name, contact_name, phone, email, industry, tags, notes, status, in_reserve, created_at, profiles(full_name)";

type ContactQueryRow = {
  id: string;
  owner_id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  tags: string[];
  notes: string | null;
  status: ContactStatus;
  in_reserve: boolean;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

// RLS ya filtra: si el id no existe o el contacto es de otro owner (y
// quien pregunta no es admin), la fila simplemente no aparece — no hay
// diferencia entre "no existe" y "no es tuyo", y no debería haberla (no
// filtramos esa información).
export default async function ContactoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contact, error }, profile] = await Promise.all([
    supabase.from("contacts").select(CONTACT_SELECT).eq("id", id).single(),
    getCurrentProfile(),
  ]);

  if (error || !contact) {
    notFound();
  }

  const row = contact as unknown as ContactQueryRow;
  const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return (
    <ContactDetailView
      contact={{
        id: row.id,
        owner_id: row.owner_id,
        owner_full_name: owner?.full_name ?? null,
        business_name: row.business_name,
        contact_name: row.contact_name,
        phone: row.phone,
        email: row.email,
        industry: row.industry,
        tags: row.tags,
        notes: row.notes,
        status: row.status,
        in_reserve: row.in_reserve,
        created_at: row.created_at,
      }}
      isAdmin={profile?.role === "admin"}
    />
  );
}
