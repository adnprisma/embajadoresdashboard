"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

// Este archivo cubre la capa de datos de /dinero: comisiones (lectura
// directa de la tabla, sin cálculo — commissions es de solo lectura para
// el cliente por RLS, así que un select no "calcula dinero", solo lo
// muestra). El monedero (points_ledger) se quitó de la UI — ver bloque de
// pausa de /ranking y /mi-link — pero las funciones RPC my_wallet_summary
// y my_wallet_history siguen existiendo por si se retoma.

export const commissionsKeys = {
  all: ["commissions"] as const,
  history: () => [...commissionsKeys.all, "history"] as const,
};

// /dinero ("Mi dinero") es una pantalla personal: admin no es excepción.
// RLS le da a admin `owner_id = auth.uid() or is_admin()`, así que sin este
// filtro admin vería las comisiones de TODO el equipo mezcladas con las
// suyas — filtro explícito, sin confiar en RLS (ver CLAUDE.md §3).
export function useCommissionsHistory() {
  return useQuery({
    queryKey: commissionsKeys.history(),
    queryFn: async () => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("commissions")
        .select("id, concept, amount, status, is_estimate, folio, period, paid_at")
        .eq("owner_id", ownerId)
        .order("period", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
