"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PaymentModality, PlatformReferralOwner } from "@/config/appSettings";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";

export type ClientRow = {
  id: string;
  name: string;
  plan: string | null;
  mrr: number;
  status: string;
  started_at: string;
  next_renewal: string | null;
  contact_id: string | null;
  payment_modality: PaymentModality | null;
  platform_referral_owner: PlatformReferralOwner | null;
  // El paquete de la cotización VIGENTE (la más reciente), o null si el
  // cliente todavía no tiene ninguna — nunca se infiere de `plan` (texto
  // libre). Sirve solo para decidir si el link de Stripe de la modalidad
  // elegida ya existe (ver ClientesView.tsx) — no se muestra en la tabla.
  latest_quote_package_id: string | null;
};

export const clientsKeys = {
  all: ["clients"] as const,
  list: () => [...clientsKeys.all, "list"] as const,
  detail: (id: string) => [...clientsKeys.all, "detail", id] as const,
};

// `opportunities(contact_id, quotes(package_id, created_at))` es un doble
// embed de PostgREST: clients.opportunity_id -> opportunities.id, y desde
// ahí quotes.opportunity_id -> opportunities.id — una sola query para toda
// la lista, en vez de una consulta de cotización por fila (N+1). Se pide
// el arreglo completo de quotes (puede haber más de una en teoría) y se
// toma la más reciente en toClientRow — PostgREST no deja ordenar/limitar
// un embed anidado dos niveles desde el cliente de JS de forma simple, así
// que el "más reciente primero" se resuelve aquí, no en la query.
const CLIENTS_SELECT =
  "id, name, plan, mrr, status, started_at, next_renewal, payment_modality, platform_referral_owner, opportunities(contact_id, quotes(package_id, created_at))";

type ClientQueryRow = {
  id: string;
  name: string;
  plan: string | null;
  mrr: number;
  status: string;
  started_at: string;
  next_renewal: string | null;
  payment_modality: PaymentModality | null;
  platform_referral_owner: PlatformReferralOwner | null;
  opportunities:
    | { contact_id: string | null; quotes: { package_id: string | null; created_at: string }[] | null }
    | { contact_id: string | null; quotes: { package_id: string | null; created_at: string }[] | null }[]
    | null;
};

function toClientRow(row: ClientQueryRow): ClientRow {
  const opportunity = Array.isArray(row.opportunities) ? row.opportunities[0] : row.opportunities;
  const quotes = opportunity?.quotes ?? [];
  const latestQuote = [...quotes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];

  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    mrr: row.mrr,
    status: row.status,
    started_at: row.started_at,
    next_renewal: row.next_renewal,
    contact_id: opportunity?.contact_id ?? null,
    payment_modality: row.payment_modality,
    platform_referral_owner: row.platform_referral_owner,
    latest_quote_package_id: latestQuote?.package_id ?? null,
  };
}

export function useClients() {
  return useQuery({
    queryKey: clientsKeys.list(),
    queryFn: async (): Promise<ClientRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("clients")
        .select(CLIENTS_SELECT)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as ClientQueryRow[]).map(toClientRow);
    },
  });
}

// Solo commissions importa: es la única FK hacia clients (client_id on
// delete set null — ver 0001_schema.sql). Nada se borra en cascada al
// borrar un cliente, solo se desvincula.
export type ClientRelatedCounts = { commissions: number };

export function useClientRelatedCounts(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...clientsKeys.detail(id), "related-counts"],
    queryFn: async (): Promise<ClientRelatedCounts> => {
      const supabase = createClient();
      const result = await supabase
        .from("commissions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", id);
      if (result.error) throw result.error;
      return { commissions: result.count ?? 0 };
    },
    enabled,
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: clientsKeys.list() });
      const previous = queryClient.getQueryData<ClientRow[]>(clientsKeys.list());

      queryClient.setQueryData<ClientRow[]>(clientsKeys.list(), (old) =>
        old ? old.filter((client) => client.id !== id) : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(clientsKeys.list(), context.previous);
      toast.error(copy.clientes.deleteDialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.clientes.deleteDialog.successToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.list() });
    },
  });
}

// Metadato que decide un admin, no dinero calculado — mutación directa,
// sin RPC (mismo criterio que useUpdateDailyLeadTarget en profile.ts). La
// confirmación nativa (window.confirm) vive en ClientesView.tsx, antes de
// llamar a este mutate.
export function useUpdatePaymentModality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { clientId: string; paymentModality: PaymentModality | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .update({ payment_modality: input.paymentModality })
        .eq("id", input.clientId);
      if (error) throw error;
    },
    onError: () => toast.error(copy.clientes.paymentModality.errorToast),
    onSuccess: () => toast.success(copy.clientes.paymentModality.successToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientsKeys.list() }),
  });
}

// Mismo patrón que useUpdatePaymentModality — ver el comentario ahí. La
// comisión de la contratación de plataforma se acredita a quien sea dueño
// del link elegido aquí, pero elegirlo en sí no mueve dinero por sí solo.
export function useUpdatePlatformReferralOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { clientId: string; owner: PlatformReferralOwner | null }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .update({ platform_referral_owner: input.owner })
        .eq("id", input.clientId);
      if (error) throw error;
    },
    onError: () => toast.error(copy.clientes.platformReferralOwner.errorToast),
    onSuccess: () => toast.success(copy.clientes.platformReferralOwner.successToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientsKeys.list() }),
  });
}
