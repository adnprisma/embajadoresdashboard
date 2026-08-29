"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ProspectAnalysisRow = {
  id: string;
  contact_id: string | null;
  business_name: string;
  score: number | null;
  is_urgent: boolean | null;
  colonia: string | null;
  alcaldia: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  web_note: string | null;
  has_web: boolean | null;
  has_whatsapp: boolean | null;
  has_reservas: boolean | null;
  has_crm: boolean | null;
  has_chat: boolean | null;
  has_blog: boolean | null;
  has_redes: boolean | null;
  gaps: string[] | null;
  note: string | null;
  source_file: string | null;
};

const PROSPECT_ANALYSIS_SELECT =
  "id, contact_id, business_name, score, is_urgent, colonia, alcaldia, address, phone, email, web_note, has_web, has_whatsapp, has_reservas, has_crm, has_chat, has_blog, has_redes, gaps, note, source_file";

export const prospectAnalysisKeys = {
  all: ["prospectAnalysis"] as const,
  forContact: (contactId: string) => [...prospectAnalysisKeys.all, "contact", contactId] as const,
};

// A lo más una fila por contacto en la práctica (business_name matcheó
// 1:1 al importar), pero la tabla no lo fuerza — por eso ordena por
// created_at desc y toma la más reciente en vez de asumir unicidad.
export function useProspectAnalysis(contactId: string, enabled: boolean) {
  return useQuery({
    queryKey: prospectAnalysisKeys.forContact(contactId),
    queryFn: async (): Promise<ProspectAnalysisRow | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("prospect_analysis")
        .select(PROSPECT_ANALYSIS_SELECT)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ProspectAnalysisRow | null;
    },
    enabled,
  });
}
