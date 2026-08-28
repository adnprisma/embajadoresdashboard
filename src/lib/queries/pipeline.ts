"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

export type PipelineStage = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
};

export type OpportunityRow = {
  id: string;
  contact_id: string | null;
  business_name: string;
  stage_id: string;
  value: number;
  mrr: number;
  position: number;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityInput = {
  business_name: string;
  contact_id?: string | null;
  stage_id: string;
  value?: number;
  mrr?: number;
  notes?: string | null;
};

export type PipelineMetrics = {
  new_month: number;
  analyses: number;
  show_rate: number;
  close_rate: number;
  volume_month: number;
  closes_month: number;
};

const pipelineMetricsSchema = z.object({
  new_month: z.number(),
  analyses: z.number(),
  show_rate: z.number(),
  close_rate: z.number(),
  volume_month: z.number(),
  closes_month: z.number(),
});

export const pipelineKeys = {
  all: ["pipeline"] as const,
  stages: () => [...pipelineKeys.all, "stages"] as const,
  opportunities: () => [...pipelineKeys.all, "opportunities"] as const,
  metrics: () => [...pipelineKeys.all, "metrics"] as const,
};

const OPPORTUNITIES_SELECT =
  "id, contact_id, business_name, stage_id, value, mrr, position, closed_at, notes, created_at, updated_at";

// Etapas de referencia: casi no cambian, pero se leen con el mismo staleTime
// global (30s) que todo lo demás — no hay razón para un caso especial aquí.
export function usePipelineStages() {
  return useQuery({
    queryKey: pipelineKeys.stages(),
    queryFn: async (): Promise<PipelineStage[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, name, icon, accent, position, is_won, is_lost")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useOpportunities() {
  return useQuery({
    queryKey: pipelineKeys.opportunities(),
    queryFn: async (): Promise<OpportunityRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opportunities")
        .select(OPPORTUNITIES_SELECT)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function usePipelineMetrics() {
  return useQuery({
    queryKey: pipelineKeys.metrics(),
    queryFn: async (): Promise<PipelineMetrics> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("my_pipeline_metrics");
      if (error) throw error;
      return pipelineMetricsSchema.parse(data?.[0]);
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OpportunityInput) => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opportunities")
        .insert({ ...input, owner_id: ownerId })
        .select(OPPORTUNITIES_SELECT)
        .single();
      if (error) throw error;
      return data;
    },
    onError: () => {
      toast.error(copy.pipeline.dialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.dialog.successToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
    },
  });
}

// Mover una tarjeta de columna es el mismo tipo de escritura directa que ya
// usa contacts.ts (RLS por owner_id, sin cálculo de dinero ni permisos) —
// no necesita pasar por una RPC. `closed_at` se marca/limpia aquí porque
// my_pipeline_metrics() depende de esa columna para volume_month/closes_month:
// dejarla desincronizada rompería las métricas de esta misma pantalla.
export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stageId,
      isTerminal,
    }: {
      id: string;
      stageId: string;
      isTerminal: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("opportunities")
        .update({ stage_id: stageId, closed_at: isTerminal ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return { id, stageId };
    },
    onMutate: async ({ id, stageId }) => {
      await queryClient.cancelQueries({ queryKey: pipelineKeys.opportunities() });
      const previous = queryClient.getQueryData<OpportunityRow[]>(pipelineKeys.opportunities());

      queryClient.setQueryData<OpportunityRow[]>(pipelineKeys.opportunities(), (old) =>
        old ? old.map((opportunity) => (opportunity.id === id ? { ...opportunity, stage_id: stageId } : opportunity)) : old,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(pipelineKeys.opportunities(), context.previous);
      toast.error(copy.pipeline.moveErrorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.moveSuccessToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
    },
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: pipelineKeys.opportunities() });
      const previous = queryClient.getQueryData<OpportunityRow[]>(pipelineKeys.opportunities());

      queryClient.setQueryData<OpportunityRow[]>(pipelineKeys.opportunities(), (old) =>
        old ? old.filter((opportunity) => opportunity.id !== id) : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(pipelineKeys.opportunities(), context.previous);
      toast.error(copy.pipeline.deleteDialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.deleteDialog.successToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
    },
  });
}
