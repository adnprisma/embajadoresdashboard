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
  allMap: () => [...prospectAnalysisKeys.all, "map"] as const,
};

// Mismo techo y misma estrategia que useContacts() (ver contacts.ts): trae
// TODO prospect_analysis en bloques de PAGE_SIZE, sin filtro de servidor —
// la vista Comparativa de /contactos cruza esto en cliente contra los
// contactos ya filtrados. `enabled` se controla desde fuera: solo se pide
// mientras esa vista está abierta, para no pagar el costo en la vista Lista.
const PAGE_SIZE = 500;
const MAX_PAGES = 50;

export function useAllProspectAnalysis(enabled: boolean) {
  return useQuery({
    queryKey: prospectAnalysisKeys.allMap(),
    queryFn: async (): Promise<Map<string, ProspectAnalysisRow>> => {
      const supabase = createClient();
      const map = new Map<string, ProspectAnalysisRow>();

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("prospect_analysis")
          .select(PROSPECT_ANALYSIS_SELECT)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) throw error;

        // created_at desc: si dos filas comparten contact_id, la más
        // reciente ya se vio primero y gana — mismo criterio que
        // useProspectAnalysis() para una sola ficha.
        for (const row of (data as ProspectAnalysisRow[] | null) ?? []) {
          if (!row.contact_id || map.has(row.contact_id)) continue;
          map.set(row.contact_id, row);
        }

        if (!data || data.length < PAGE_SIZE) break;
      }

      return map;
    },
    enabled,
  });
}

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
