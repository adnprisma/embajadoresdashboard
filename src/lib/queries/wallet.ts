"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

// Este archivo cubre toda la capa de datos de /dinero: monedero (puntos,
// points_ledger vía RPC) y comisiones (lectura directa de la tabla, sin
// cálculo — commissions es de solo lectura para el cliente por RLS, así
// que un select no "calcula dinero", solo lo muestra).

export const walletKeys = {
  all: ["wallet"] as const,
  summary: () => [...walletKeys.all, "summary"] as const,
  history: () => [...walletKeys.all, "history"] as const,
};

export const commissionsKeys = {
  all: ["commissions"] as const,
  history: () => [...commissionsKeys.all, "history"] as const,
};

const walletSummarySchema = z.object({
  available: z.number(),
  locked: z.number(),
  total: z.number(),
});

export type WalletSummary = z.infer<typeof walletSummarySchema>;

export function useWalletSummary() {
  return useQuery({
    queryKey: walletKeys.summary(),
    queryFn: async (): Promise<WalletSummary> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("my_wallet_summary");
      if (error) throw error;
      return walletSummarySchema.parse(data?.[0]);
    },
  });
}

// my_wallet_history(p_from, p_to) exige un rango — se pide todo el
// histórico posible en una sola llamada porque el filtrado (estado, tipo,
// periodo) es 100% en cliente, no vía red.
const WALLET_HISTORY_FROM = "2000-01-01";
const WALLET_HISTORY_TO = "2100-01-01";

export function useWalletHistory() {
  return useQuery({
    queryKey: walletKeys.history(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("my_wallet_history", {
        p_from: WALLET_HISTORY_FROM,
        p_to: WALLET_HISTORY_TO,
      });
      if (error) throw error;
      return data;
    },
  });
}

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
