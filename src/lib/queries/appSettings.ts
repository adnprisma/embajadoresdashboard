"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type AppSettingsMap = Record<string, string | null>;

export const appSettingsKeys = {
  all: ["appSettings"] as const,
};

// Un solo query para todas las claves: la pantalla de datos de pago las
// necesita todas juntas (banco + los 3 links de Stripe), y son pocas filas
// — no hay razón para seis queries donde cabe una.
export function useAppSettings() {
  return useQuery({
    queryKey: appSettingsKeys.all,
    queryFn: async (): Promise<AppSettingsMap> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("app_settings").select("key, value");
      if (error) throw error;
      return Object.fromEntries(data.map((row) => [row.key, row.value]));
    },
  });
}
