import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactDetailView } from "./ContactDetailView";

const CONTACT_SELECT =
  "id, business_name, contact_name, phone, email, industry, tags, notes, created_at";

// RLS ya filtra: si el id no existe o el contacto es de otro owner, la
// fila simplemente no aparece — no hay diferencia entre "no existe" y
// "no es tuyo", y no debería haberla (no filtramos esa información).
export default async function ContactoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("id", id)
    .single();

  if (error || !contact) {
    notFound();
  }

  return <ContactDetailView contact={contact} />;
}
