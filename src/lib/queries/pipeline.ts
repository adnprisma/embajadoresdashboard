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
  // Valor estimado: libre mientras la oportunidad esté abierta, puede
  // quedar vacío ("Sin estimar", nunca $0 — ver MoneyValue). Valor cerrado:
  // solo existe una vez ganada, y desde ahí es inmutable desde la UI (ver
  // update_opportunity_stage en 0016_opportunity_value_split.sql). Nunca se
  // suman entre sí — si aparecen juntos en una pantalla, van etiquetados
  // por separado.
  estimated_value: number | null;
  closed_value: number | null;
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
  estimated_value?: number | null;
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
  forContact: (contactId: string) => [...pipelineKeys.all, "contact", contactId] as const,
  detail: (id: string) => [...pipelineKeys.all, "detail", id] as const,
};

const OPPORTUNITIES_SELECT =
  "id, contact_id, business_name, stage_id, estimated_value, closed_value, mrr, position, closed_at, notes, created_at, updated_at";

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

// Contact_id de MIS oportunidades (cualquier etapa), para el plan semanal —
// mismo motivo que useOwnOpenTaskContactIds() en tasks.ts: un admin ve las
// oportunidades de todo el equipo vía RLS, así que useOpportunities() no
// sirve para "¿ya tiene oportunidad ESTE usuario?".
export function useOwnOpportunityContactIds(ownerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...pipelineKeys.all, "ownOpportunityContactIds", ownerId] as const,
    queryFn: async (): Promise<Set<string>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opportunities")
        .select("contact_id")
        .eq("owner_id", ownerId as string)
        .not("contact_id", "is", null);
      if (error) throw error;
      return new Set((data as { contact_id: string }[]).map((row) => row.contact_id));
    },
    enabled: enabled && Boolean(ownerId),
  });
}

// Query separada de useOpportunities() a propósito, con su propia llave de
// caché: la pestaña "Oportunidades" de la ficha de contacto necesita poder
// invalidarse sola sin depender de que /pipeline esté montado (o viceversa).
// useCreateOpportunity() invalida las dos cuando la oportunidad trae
// contact_id, para que ninguna pantalla se quede desincronizada.
export function useContactOpportunities(contactId: string) {
  return useQuery({
    queryKey: pipelineKeys.forContact(contactId),
    queryFn: async (): Promise<OpportunityRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opportunities")
        .select(OPPORTUNITIES_SELECT)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
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
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
      // Si la oportunidad se creó desde la ficha de un contacto (o trae
      // contact_id por cualquier otro camino), esa pestaña tiene su propia
      // caché — sin esto se queda mostrando el EmptyState aunque /pipeline
      // ya la vea.
      if (variables.contact_id) {
        queryClient.invalidateQueries({ queryKey: pipelineKeys.forContact(variables.contact_id) });
      }
    },
  });
}

// Mover una tarjeta de columna pasa por update_opportunity_stage() (RPC
// security definer, ver 0016_opportunity_value_split.sql) y ya no por una
// escritura directa: la validación de "ganar exige closed_value" y "ganar
// es terminal" es dinero/permiso, y CLAUDE.md §3 prohíbe que eso viva en el
// cliente. `closedValue` solo se manda cuando la etapa destino es is_won —
// el capture dialog (CloseOpportunityDialog) es quien la pide antes de
// llegar aquí.
export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      stageId,
      closedValue,
    }: {
      id: string;
      stageId: string;
      closedValue?: number;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_opportunity_stage", {
        p_opportunity_id: id,
        p_stage_id: stageId,
        p_closed_value: closedValue ?? null,
      });
      if (error) throw error;
      return { id, stageId };
    },
    onMutate: async ({ id, stageId, closedValue }) => {
      await queryClient.cancelQueries({ queryKey: pipelineKeys.opportunities() });
      const previous = queryClient.getQueryData<OpportunityRow[]>(pipelineKeys.opportunities());

      queryClient.setQueryData<OpportunityRow[]>(pipelineKeys.opportunities(), (old) =>
        old
          ? old.map((opportunity) =>
              opportunity.id === id
                ? { ...opportunity, stage_id: stageId, closed_value: closedValue ?? opportunity.closed_value }
                : opportunity,
            )
          : old,
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
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(variables.id) });
    },
  });
}

// Pasa por delete_opportunity() (RPC), no por un delete directo — el
// servidor rechaza borrar una oportunidad ganada (ver
// 0017_opportunity_delete_guard.sql). La UI ya oculta la opción de borrar
// para tarjetas ganadas, pero la validación real vive aquí, no en que el
// botón esté escondido.
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.rpc("delete_opportunity", { p_opportunity_id: id });
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

// owner_full_name/contact_business_name solo existen aquí, no en
// OPPORTUNITIES_SELECT (el tablero no los necesita) — evita el join extra
// en la query que sí corre en cada carga de /pipeline.
export type OpportunityDetail = OpportunityRow & {
  owner_full_name: string | null;
  contact_business_name: string | null;
};

type OpportunityDetailQueryRow = {
  id: string;
  contact_id: string | null;
  business_name: string;
  stage_id: string;
  estimated_value: number | null;
  closed_value: number | null;
  mrr: number;
  position: number;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
  contacts: { business_name: string } | { business_name: string }[] | null;
};

const OPPORTUNITY_DETAIL_SELECT =
  "id, contact_id, business_name, stage_id, estimated_value, closed_value, mrr, position, closed_at, notes, created_at, updated_at, profiles(full_name), contacts(business_name)";

function toOpportunityDetail(row: OpportunityDetailQueryRow): OpportunityDetail {
  const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  return {
    id: row.id,
    contact_id: row.contact_id,
    business_name: row.business_name,
    stage_id: row.stage_id,
    estimated_value: row.estimated_value,
    closed_value: row.closed_value,
    mrr: row.mrr,
    position: row.position,
    closed_at: row.closed_at,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_full_name: owner?.full_name ?? null,
    contact_business_name: contact?.business_name ?? null,
  };
}

// `initialData` viene del fetch server-side de /pipeline/[id]/page.tsx —
// mismo patrón que useContact() en contacts.ts.
export function useOpportunity(id: string, initialData?: OpportunityDetail) {
  return useQuery({
    queryKey: pipelineKeys.detail(id),
    queryFn: async (): Promise<OpportunityDetail> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("opportunities")
        .select(OPPORTUNITY_DETAIL_SELECT)
        .eq("id", id)
        .single();
      if (error) throw error;
      return toOpportunityDetail(data as OpportunityDetailQueryRow);
    },
    initialData,
  });
}

// Notas: se editan in situ desde /pipeline/[id], sin diálogo — update
// directo a la tabla (RLS ya exige owner_id = auth.uid() o admin, ver
// 0010_rls_admin.sql). No hay cálculo ni dinero de por medio, así que no
// hace falta un RPC para esto.
export function useUpdateOpportunityNotes(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notes: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("opportunities").update({ notes: notes.trim() || null }).eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast.error(copy.pipeline.detail.notes.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.detail.notes.successToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
    },
  });
}

// Valor estimado: editable a mano SOLO mientras no exista ninguna
// cotización y la etapa no sea terminal — la pantalla (OpportunityDetailView)
// es quien decide si el campo se pinta editable, esta mutación no repite esa
// regla porque no hay nada que calcular aquí tampoco: es un número que la
// vendedora decide, igual que hoy lo decide una vez al crear la oportunidad
// (useCreateOpportunity, arriba). En cuanto exista una cotización, este
// campo lo vuelve a escribir generate_quote(), nunca esta mutación.
export function useUpdateOpportunityEstimatedValue(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimatedValue: number) => {
      const supabase = createClient();
      const { error } = await supabase.from("opportunities").update({ estimated_value: estimatedValue }).eq("id", id);
      if (error) throw error;
    },
    onError: () => {
      toast.error(copy.pipeline.detail.estimatedValue.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.detail.estimatedValue.successToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
    },
  });
}
