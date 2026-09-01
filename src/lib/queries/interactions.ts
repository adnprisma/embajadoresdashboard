"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type InteractionRow = {
  id: string;
  contact_id: string;
  kind: string;
  body: string | null;
  // Solo tienen valor cuando kind === "status_change" (ver
  // change_contact_status en 0015_contact_status.sql). El resto de los
  // kinds (call/message/meeting/note) los deja en null.
  from_status: string | null;
  to_status: string | null;
  occurred_at: string;
};

export const interactionsKeys = {
  all: ["interactions"] as const,
  forContact: (contactId: string) => [...interactionsKeys.all, "contact", contactId] as const,
};

export function useContactInteractions(contactId: string) {
  return useQuery({
    queryKey: interactionsKeys.forContact(contactId),
    queryFn: async (): Promise<InteractionRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("interactions")
        .select("id, contact_id, kind, body, from_status, to_status, occurred_at")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
