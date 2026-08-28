"use client";

import { useQuery } from "@tanstack/react-query";
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

// Para distinguir "mío" de "de un compañero" en datos con visibilidad
// compartida (ej. appointments con visibility='team' — ver
// appointments_team_select en 0002_rls.sql). El uid de sesión no cambia
// durante la sesión, así que staleTime: Infinity es correcto aquí.
export function useCurrentUserId() {
  return useQuery({
    queryKey: ["auth", "userId"],
    queryFn: getOwnerId,
    staleTime: Infinity,
  });
}
