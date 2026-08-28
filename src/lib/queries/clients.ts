"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
};

export const clientsKeys = {
  all: ["clients"] as const,
  list: () => [...clientsKeys.all, "list"] as const,
  detail: (id: string) => [...clientsKeys.all, "detail", id] as const,
};

// `opportunities(contact_id)` es un embed de PostgREST vía clients.opportunity_id
// -> opportunities.id — así la fila puede enlazar a /contactos/[id] cuando el
// cliente viene de una oportunidad con contacto (ambos son nullable en cadena,
// así que no siempre hay a dónde enlazar — la tabla lo maneja con getRowHref
// devolviendo "").
const CLIENTS_SELECT = "id, name, plan, mrr, status, started_at, next_renewal, opportunities(contact_id)";

type ClientQueryRow = {
  id: string;
  name: string;
  plan: string | null;
  mrr: number;
  status: string;
  started_at: string;
  next_renewal: string | null;
  opportunities: { contact_id: string | null } | { contact_id: string | null }[] | null;
};

function toClientRow(row: ClientQueryRow): ClientRow {
  const opportunity = Array.isArray(row.opportunities) ? row.opportunities[0] : row.opportunities;
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    mrr: row.mrr,
    status: row.status,
    started_at: row.started_at,
    next_renewal: row.next_renewal,
    contact_id: opportunity?.contact_id ?? null,
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
