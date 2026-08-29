"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { contactsKeys } from "@/lib/queries/contacts";

export type ContactAssignmentRow = {
  id: string;
  contact_id: string;
  from_owner_name: string | null;
  to_owner_name: string;
  assigned_by_name: string;
  reason: string | null;
  created_at: string;
};

// contact_assignments tiene TRES FK distintas a profiles (from_owner,
// to_owner, assigned_by) — el alias `tabla!columna` es obligatorio para
// que PostgREST sepa cuál relación resolver en cada embed.
type AssignmentQueryRow = {
  id: string;
  contact_id: string;
  reason: string | null;
  created_at: string;
  from: { full_name: string } | { full_name: string }[] | null;
  to: { full_name: string } | { full_name: string }[] | null;
  by: { full_name: string } | { full_name: string }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toAssignmentRow(row: AssignmentQueryRow): ContactAssignmentRow {
  return {
    id: row.id,
    contact_id: row.contact_id,
    from_owner_name: one(row.from)?.full_name ?? null,
    to_owner_name: one(row.to)?.full_name ?? "",
    assigned_by_name: one(row.by)?.full_name ?? "",
    reason: row.reason,
    created_at: row.created_at,
  };
}

export const contactAssignmentsKeys = {
  all: ["contactAssignments"] as const,
  forContact: (contactId: string) => [...contactAssignmentsKeys.all, "contact", contactId] as const,
};

// Solo la usa la pestaña "Historial de asignación" de la ficha de
// contacto, gateada por isAdmin del servidor — una seller solo ve las
// filas donde ella es from_owner o to_owner (RLS de 0011), así que ni
// siquiera hace falta filtrar por rol aquí.
export function useContactAssignments(contactId: string, enabled: boolean) {
  return useQuery({
    queryKey: contactAssignmentsKeys.forContact(contactId),
    queryFn: async (): Promise<ContactAssignmentRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contact_assignments")
        .select(
          "id, contact_id, reason, created_at, from:profiles!from_owner(full_name), to:profiles!to_owner(full_name), by:profiles!assigned_by(full_name)",
        )
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as AssignmentQueryRow[]).map(toAssignmentRow);
    },
    enabled,
  });
}

export function useReassignContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    // p_assigned_by nunca se manda desde aquí: la sesión real (auth.uid())
    // es la que firma la bitácora, y la función la prefiere siempre sobre
    // cualquier parámetro — mandar uno desde el cliente no cambiaría nada,
    // así que ni se ofrece la opción.
    mutationFn: async ({
      contactIds,
      toOwner,
      reason,
    }: {
      contactIds: string[];
      toOwner: string;
      reason: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("reassign_contacts", {
        p_contact_ids: contactIds,
        p_to_owner: toOwner,
        p_reason: reason,
      });
      if (error) throw error;
      return data as number;
    },
    onError: () => {
      toast.error(copy.contactos.reassignDialog.errorToast);
    },
    onSuccess: (movedCount) => {
      toast.success(copy.contactos.reassignDialog.successToast(movedCount));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.list() });
    },
  });
}
