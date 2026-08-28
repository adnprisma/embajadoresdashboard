"use client";

import { createClient } from "./client";

// Helper de cliente compartido: toda mutación que inserta filas propias
// (contacts, y lo que siga) necesita el uid actual para owner_id — RLS lo
// exige en el WITH CHECK de cada política *_owner_all.
export async function getOwnerId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}
