import type { QuoteBreakdownData, QuoteLineItem } from "@/lib/queries/quotes";
import { computeMrr, computePagoDiferidoMensual, computePagoInicial, computeSubtotal, computeTotal } from "@/lib/quoteMath";
import {
  ADN_TIERS,
  GESTION_PLANS,
  PACKAGES,
  PLATFORM_CONSUMPTION_TIERS,
  PLATFORM_PLANS,
  PLATFORM_WHATSAPP_BRIDGE,
  PRODUCTS,
} from "@/config/pricing";
import type { GenerateQuoteInput, GenerateQuoteLineInput } from "@/lib/queries/quotes";
import type { ResolvedLine, WizardState } from "./types";

// Única fuente para "qué líneas trae esta selección" — de aquí salen tanto
// el preview (QuoteBreakdown) como lo que se manda al RPC. Si un id ya no
// existe en el catálogo (no debería pasar, la UI solo ofrece ids reales),
// se cae con un id como nombre en vez de tronar: el preview es tolerante,
// generate_quote() es quien de verdad valida y rechaza (ver 0023_quotes.sql).
export function deriveLines(state: WizardState): ResolvedLine[] {
  const productLines: ResolvedLine[] = state.extraProducts.map((selection) => ({
    itemType: "producto",
    itemId: selection.itemId,
    itemName: PRODUCTS.find((p) => p.id === selection.itemId)?.name ?? selection.itemId,
    quotedPrice: selection.price,
  }));

  const adnLines: ResolvedLine[] = state.extraAdn.map((selection) => ({
    itemType: "adn",
    itemId: selection.itemId,
    itemName: ADN_TIERS.find((a) => a.id === selection.itemId)?.name ?? selection.itemId,
    quotedPrice: selection.price,
  }));

  const gestionLines: ResolvedLine[] = state.gestionId
    ? (() => {
        const plan = GESTION_PLANS.find((g) => g.id === state.gestionId);
        return plan ? [{ itemType: "gestion" as const, itemId: plan.id, itemName: plan.name, quotedPrice: plan.price }] : [];
      })()
    : [];

  return [...productLines, ...adnLines, ...gestionLines];
}

// Preview client-side, misma fórmula que generate_quote() (ver
// src/lib/quoteMath.ts) — nunca se envía, solo se muestra antes de enviar.
export function buildPreview(state: WizardState): QuoteBreakdownData {
  const lines = deriveLines(state);
  const pkg = state.mode === "pkg" && state.packageId ? PACKAGES.find((p) => p.id === state.packageId) : null;
  const plan = PLATFORM_PLANS.find((p) => p.id === state.platformPlanId);
  const consumo = PLATFORM_CONSUMPTION_TIERS.find((c) => c.id === state.platformConsumoId);
  const whatsappPrice = plan?.includesWhatsapp ? null : state.whatsappIncluded ? PLATFORM_WHATSAPP_BRIDGE.price : null;

  const subtotal = computeSubtotal(state.mode, state.packagePrice, lines);
  const total = computeTotal(subtotal, state.precioEspecial);
  const pagoInicial = computePagoInicial(total);

  const breakdownLines: QuoteLineItem[] = lines.map((line, index) => ({
    id: `${line.itemType}-${line.itemId}-${index}`,
    itemType: line.itemType,
    itemId: line.itemId,
    itemName: line.itemName,
    quotedPrice: line.quotedPrice,
  }));

  return {
    mode: state.mode,
    packageId: pkg?.id ?? null,
    packageQuotedPrice: state.mode === "pkg" ? state.packagePrice : null,
    packageAdnTierId: pkg?.includedAdnTierId ?? null,
    mesesDiferimiento: state.mesesDiferimiento,
    platformPlanId: state.platformPlanId,
    platformPlanPrice: plan?.price ?? 0,
    platformConsumoId: state.platformConsumoId,
    platformConsumoPrice: consumo?.price ?? 0,
    platformWhatsappPrice: whatsappPrice,
    precioEspecial: state.precioEspecial,
    subtotal,
    total,
    pagoInicial,
    pagoDiferidoMensual: computePagoDiferidoMensual(total, pagoInicial, state.mesesDiferimiento),
    lines: breakdownLines,
  };
}

export function computeRunningTotal(state: WizardState): number {
  const lines = deriveLines(state);
  const subtotal = computeSubtotal(state.mode, state.packagePrice, lines);
  return computeTotal(subtotal, state.precioEspecial);
}

export function computeRunningMrr(state: WizardState): number {
  return computeMrr(deriveLines(state));
}

// Lo que de verdad se manda a generate_quote() — nunca un total, la
// SELECCIÓN (ver useGenerateQuote en lib/queries/quotes.ts).
export function buildGenerateQuoteInput(opportunityId: string, state: WizardState): GenerateQuoteInput {
  const lines = deriveLines(state);
  const rpcLines: GenerateQuoteLineInput[] = lines.map((line) => ({
    itemType: line.itemType,
    itemId: line.itemId,
    quotedPrice: line.quotedPrice,
  }));

  const pkg = state.mode === "pkg" && state.packageId ? PACKAGES.find((p) => p.id === state.packageId) : null;

  return {
    opportunityId,
    mode: state.mode,
    mesesDiferimiento: state.mesesDiferimiento,
    whatsappIncluido: state.whatsappIncluded,
    platformPlanId: state.platformPlanId,
    platformConsumoId: state.platformConsumoId,
    lines: rpcLines,
    packageId: pkg?.id,
    packageQuotedPrice: pkg && state.packagePrice !== null ? state.packagePrice : undefined,
    packageAdnTierId: pkg?.includedAdnTierId,
    precioEspecial: state.precioEspecial ?? undefined,
  };
}
