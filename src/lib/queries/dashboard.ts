"use client";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
};

// my_dashboard_summary() (supabase/migrations/0003_functions.sql) devuelve
// jsonb sin tipo estático — se valida en runtime en vez de solo castear,
// para no confiar a ciegas en la forma del JSON.
const dashboardSummarySchema = z.object({
  earned_this_month: z.number(),
  active_clients: z.number(),
  mrr: z.number(),
  ranking: z.object({
    position: z.number(),
    total_users: z.number(),
  }),
  commission_status: z.record(
    z.string(),
    z.object({
      amount: z.number(),
      count: z.number(),
      is_estimate: z.boolean(),
    }),
  ),
  sales: z.object({
    new_month: z.number(),
    closes_month: z.number(),
    close_rate: z.number(),
  }),
  chart_series: z.array(
    z.object({
      month: z.string(),
      amount: z.number(),
    }),
  ),
  recent_commissions: z.array(
    z.object({
      id: z.string(),
      concept: z.string(),
      amount: z.number(),
      status: z.string(),
      is_estimate: z.boolean(),
      client_name: z.string().nullable(),
      period: z.string(),
    }),
  ),
  upcoming_renewals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      mrr: z.number(),
      next_renewal: z.string(),
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async (): Promise<DashboardSummary> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("my_dashboard_summary");
      if (error) throw error;
      return dashboardSummarySchema.parse(data);
    },
  });
}
