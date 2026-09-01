"use client";

import { useQuery } from "@tanstack/react-query";
import type { ContactStatus } from "@/config/contactStatus";
import { createClient } from "@/lib/supabase/client";

export type WeeklyStatusFunnelRow = {
  owner_id: string;
  to_status: ContactStatus;
  contact_count: number;
};

export const weeklyStatusFunnelKeys = {
  all: ["weeklyStatusFunnel"] as const,
  week: (weeksAgo: number) => [...weeklyStatusFunnelKeys.all, weeksAgo] as const,
};

// weeksAgo: 0 = semana en curso, 1 = la anterior. El RPC decide solo (admin
// ve todo el equipo, una vendedora solo lo propio) — ver
// 0019_weekly_status_funnel.sql, no hay parámetro de owner aquí a propósito.
export function useWeeklyStatusFunnel(weeksAgo: number) {
  return useQuery({
    queryKey: weeklyStatusFunnelKeys.week(weeksAgo),
    queryFn: async (): Promise<WeeklyStatusFunnelRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("weekly_status_funnel", { p_weeks_ago: weeksAgo });
      if (error) throw error;
      return data as WeeklyStatusFunnelRow[];
    },
  });
}
