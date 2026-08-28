"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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

export function useCommissionsHistory() {
  return useQuery({
    queryKey: commissionsKeys.history(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("commissions")
        .select("id, concept, amount, status, is_estimate, folio, period, paid_at")
        .order("period", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
