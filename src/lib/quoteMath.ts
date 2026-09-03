// Réplica en cliente de la aritmética de generate_quote()
// (supabase/migrations/0023_quotes.sql) — SOLO para el preview del wizard
// de captura (bloque 5b), ANTES de enviar. El total que de verdad se
// guarda siempre lo calcula el servidor; esto nunca escribe nada (CLAUDE.md
// §3: el cliente nunca calcula ni escribe dinero). Si esta réplica se
// desalinea del RPC, el wizard lo detecta comparando su preview contra el
// total que regresa generate_quote() al enviar — ver useGenerateQuote() y
// QuoteWizard.
//
// Tres reglas espejo del RPC, no las rompas aquí tampoco:
// 1. Gestión (recurrente, MXN) nunca entra a subtotal/total — solo a mrr.
// 2. Plataforma (recurrente, USD, ni siquiera es ingreso de Prisma) nunca
//    entra a subtotal/total ni a mrr.
// 3. pago_inicial = min(5000, total) — no un porcentaje, un tope fijo.

export type QuoteMathLine = {
  itemType: "producto" | "adn" | "gestion";
  quotedPrice: number;
};

export function computeSubtotal(mode: "pkg" | "custom", packagePrice: number | null, lines: QuoteMathLine[]): number {
  let subtotal = mode === "pkg" ? (packagePrice ?? 0) : 0;
  for (const line of lines) {
    if (line.itemType === "gestion") continue;
    subtotal += line.quotedPrice;
  }
  return subtotal;
}

export function computeTotal(subtotal: number, precioEspecial: number | null): number {
  return precioEspecial ?? subtotal;
}

export function computePagoInicial(total: number): number {
  return Math.min(5000, total);
}

export function computePagoDiferidoMensual(total: number, pagoInicial: number, mesesDiferimiento: number): number {
  return mesesDiferimiento > 0 ? (total - pagoInicial) / mesesDiferimiento : 0;
}

export function computeMrr(lines: QuoteMathLine[]): number {
  return lines.filter((line) => line.itemType === "gestion").reduce((sum, line) => sum + line.quotedPrice, 0);
}

export function computePlatformTotal(
  planPrice: number,
  consumoPrice: number,
  whatsappPrice: number | null,
): number {
  return planPrice + consumoPrice + (whatsappPrice ?? 0);
}
