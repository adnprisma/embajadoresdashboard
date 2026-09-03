"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type QuoteLineItemType = "producto" | "adn" | "gestion";

// Solo quoted_price (lo que se cobró) — seller_price/catalog_price existen
// en la base pero son información de supervisión (comparar contra el
// propio historial de precios de la vendedora), no algo que esta pantalla
// muestre. Eso vive en el bloque 6.
export type QuoteLineItem = {
  id: string;
  itemType: QuoteLineItemType;
  itemId: string;
  itemName: string;
  quotedPrice: number;
};

export type Quote = {
  id: string;
  createdAt: string;
  createdByName: string | null;
  mode: "pkg" | "custom";
  packageId: string | null;
  packageQuotedPrice: number | null;
  packageAdnTierId: string | null;
  mesesDiferimiento: number;
  whatsappIncluido: boolean;
  platformPlanId: string;
  platformPlanPrice: number;
  platformConsumoId: string;
  platformConsumoPrice: number;
  platformWhatsappPrice: number | null;
  precioEspecial: number | null;
  subtotal: number;
  total: number;
  pagoInicial: number;
  pagoDiferidoMensual: number;
  mrr: number;
  lines: QuoteLineItem[];
};

type QuoteQueryRow = {
  id: string;
  created_at: string;
  mode: "pkg" | "custom";
  package_id: string | null;
  package_quoted_price: number | null;
  package_adn_tier_id: string | null;
  meses_diferimiento: number;
  whatsapp_incluido: boolean;
  platform_plan_id: string;
  platform_plan_price: number;
  platform_consumo_id: string;
  platform_consumo_price: number;
  platform_whatsapp_price: number | null;
  precio_especial: number | null;
  subtotal: number;
  total: number;
  pago_inicial: number;
  pago_diferido_mensual: number;
  mrr: number;
  profiles: { full_name: string } | { full_name: string }[] | null;
  quote_line_items: {
    id: string;
    item_type: QuoteLineItemType;
    item_id: string;
    item_name: string;
    quoted_price: number;
  }[];
};

const QUOTE_SELECT =
  "id, created_at, mode, package_id, package_quoted_price, package_adn_tier_id, meses_diferimiento, whatsapp_incluido, platform_plan_id, platform_plan_price, platform_consumo_id, platform_consumo_price, platform_whatsapp_price, precio_especial, subtotal, total, pago_inicial, pago_diferido_mensual, mrr, profiles(full_name), quote_line_items(id, item_type, item_id, item_name, quoted_price)";

function toQuote(row: QuoteQueryRow): Quote {
  const creator = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    createdAt: row.created_at,
    createdByName: creator?.full_name ?? null,
    mode: row.mode,
    packageId: row.package_id,
    packageQuotedPrice: row.package_quoted_price,
    packageAdnTierId: row.package_adn_tier_id,
    mesesDiferimiento: row.meses_diferimiento,
    whatsappIncluido: row.whatsapp_incluido,
    platformPlanId: row.platform_plan_id,
    platformPlanPrice: row.platform_plan_price,
    platformConsumoId: row.platform_consumo_id,
    platformConsumoPrice: row.platform_consumo_price,
    platformWhatsappPrice: row.platform_whatsapp_price,
    precioEspecial: row.precio_especial,
    subtotal: row.subtotal,
    total: row.total,
    pagoInicial: row.pago_inicial,
    pagoDiferidoMensual: row.pago_diferido_mensual,
    mrr: row.mrr,
    lines: row.quote_line_items.map((line) => ({
      id: line.id,
      itemType: line.item_type,
      itemId: line.item_id,
      itemName: line.item_name,
      quotedPrice: line.quoted_price,
    })),
  };
}

export const quotesKeys = {
  all: ["quotes"] as const,
  forOpportunity: (opportunityId: string) => [...quotesKeys.all, "opportunity", opportunityId] as const,
};

// Más reciente primero — el índice 0 es "la vigente" (ver
// OpportunityDetailView, que la selecciona por default).
export function useQuoteHistory(opportunityId: string) {
  return useQuery({
    queryKey: quotesKeys.forOpportunity(opportunityId),
    queryFn: async (): Promise<Quote[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("quotes")
        .select(QUOTE_SELECT)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as QuoteQueryRow[]).map(toQuote);
    },
  });
}
