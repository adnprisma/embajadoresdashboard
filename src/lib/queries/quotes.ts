"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { pipelineKeys } from "@/lib/queries/pipeline";
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

// Lo que <QuoteBreakdown /> de verdad usa para pintar el desglose — un
// subconjunto de Quote, no Quote completo. El wizard de captura (bloque 5b)
// necesita mostrar el mismo desglose ANTES de que exista una cotización
// persistida (calculado en cliente sobre la selección, sin enviar nada), y
// en ese momento no hay id/createdAt/createdByName/mrr/whatsappIncluido
// todavía. Quote ya satisface este tipo por estructura, así que el único
// call site existente (OpportunityDetailView) no cambia.
export type QuoteBreakdownData = {
  mode: "pkg" | "custom";
  packageId: string | null;
  packageQuotedPrice: number | null;
  packageAdnTierId: string | null;
  mesesDiferimiento: number;
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

export type GenerateQuoteLineInput = {
  itemType: Extract<QuoteLineItemType, "producto" | "adn" | "gestion">;
  itemId: string;
  // Ausente solo para gestion (precio fijo — el RPC lo ignora y resuelve
  // el propio de catalog_items, ver 0023_quotes.sql). Para producto/adn es
  // obligatorio: es literalmente lo que la vendedora tecleó, el RPC nunca
  // lo recalcula.
  quotedPrice?: number;
};

export type GenerateQuoteInput = {
  opportunityId: string;
  mode: "pkg" | "custom";
  mesesDiferimiento: number;
  whatsappIncluido: boolean;
  platformPlanId: string;
  platformConsumoId: string;
  lines: GenerateQuoteLineInput[];
  packageId?: string;
  packageQuotedPrice?: number;
  packageAdnTierId?: string;
  precioEspecial?: number;
};

export type GenerateQuoteResult = {
  id: string;
  // total tal como lo guardó el servidor — el wizard lo compara contra su
  // propio preview (calculado con src/lib/quoteMath.ts) para detectar un
  // desfase entre lo que se mostró antes de enviar y lo que de verdad se
  // guardó. En operación normal deberían coincidir siempre (el RPC nunca
  // recalcula quoted_price, solo suma lo que se mandó) — si no coinciden,
  // es señal de un bug en la réplica cliente, no algo que la vendedora deba
  // resolver, pero tiene que enterarse: ver mismatchWarningToast.
  total: number;
};

// El único punto que llama a generate_quote() en toda la app — el wizard de
// captura (bloque 5b) nunca escribe a `quotes`/`quote_line_items` directo.
// Manda la SELECCIÓN (con el precio que la vendedora tecleó por línea),
// nunca un total ya sumado — el RPC resuelve seller_price/catalog_price y
// calcula subtotal/total/pagos/mrr él mismo (CLAUDE.md §3: el cliente nunca
// calcula ni escribe dinero).
export function useGenerateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateQuoteInput): Promise<GenerateQuoteResult> => {
      const supabase = createClient();
      const { data: quoteId, error } = await supabase.rpc("generate_quote", {
        p_opportunity_id: input.opportunityId,
        p_mode: input.mode,
        p_meses_diferimiento: input.mesesDiferimiento,
        p_whatsapp_incluido: input.whatsappIncluido,
        p_platform_plan_id: input.platformPlanId,
        p_platform_consumo_id: input.platformConsumoId,
        p_lines: input.lines.map((line) => ({
          item_type: line.itemType,
          item_id: line.itemId,
          quoted_price: line.quotedPrice,
        })),
        p_package_id: input.packageId ?? null,
        p_package_quoted_price: input.packageQuotedPrice ?? null,
        p_package_adn_tier_id: input.packageAdnTierId ?? null,
        p_precio_especial: input.precioEspecial ?? null,
      });
      if (error) throw error;

      const { data: quoteRow, error: readError } = await supabase
        .from("quotes")
        .select("total")
        .eq("id", quoteId as string)
        .single();
      if (readError) throw readError;

      return { id: quoteId as string, total: quoteRow.total as number };
    },
    onError: () => {
      toast.error(copy.pipeline.wizard.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.pipeline.wizard.successToast);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: quotesKeys.forOpportunity(variables.opportunityId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(variables.opportunityId) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.opportunities() });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.metrics() });
    },
  });
}
