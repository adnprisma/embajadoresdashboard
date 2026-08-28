"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export const interactionsKeys = {
  all: ["interactions"] as const,
  forContact: (contactId: string) => [...interactionsKeys.all, "contact", contactId] as const,
};

export function useContactInteractions(contactId: string) {
  return useQuery({
    queryKey: interactionsKeys.forContact(contactId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("interactions")
        .select("id, contact_id, kind, body, occurred_at")
        .eq("contact_id", contactId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
