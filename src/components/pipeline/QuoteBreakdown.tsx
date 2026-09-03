import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import { ADN_TIERS, PACKAGES, PLATFORM_CONSUMPTION_TIERS, PLATFORM_PLANS } from "@/config/pricing";
import type { QuoteBreakdownData } from "@/lib/queries/quotes";

function LineRow({ name, amount, currency }: { name: string; amount: number; currency?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 flex-1 text-text-secondary">{name}</span>
      <MoneyValue amount={amount} currency={currency} />
    </div>
  );
}

// Tres secciones separadas a propósito, nunca sumadas entre sí — mismo
// criterio que generate_quote() (ver 0023_quotes.sql): implementación es
// pago único en MXN, gestión es recurrente en MXN, plataforma es
// recurrente en USD y ni siquiera es ingreso de Prisma. Solo quoted_price
// por línea: seller_price/catalog_price existen en la base pero son
// información de supervisión (bloque 6), no algo que la vendedora necesite
// ver aquí.
export function QuoteBreakdown({ quote }: { quote: QuoteBreakdownData }) {
  const t = copy.pipeline.detail.quote;

  const packageName = quote.packageId ? (PACKAGES.find((p) => p.id === quote.packageId)?.name ?? quote.packageId) : null;
  const adnName = quote.packageAdnTierId
    ? (ADN_TIERS.find((a) => a.id === quote.packageAdnTierId)?.name ?? quote.packageAdnTierId)
    : null;
  const plan = PLATFORM_PLANS.find((p) => p.id === quote.platformPlanId);
  const planName = plan?.name ?? quote.platformPlanId;
  const consumoName =
    PLATFORM_CONSUMPTION_TIERS.find((c) => c.id === quote.platformConsumoId)?.name ?? quote.platformConsumoId;
  const planIncludesWhatsapp = plan?.includesWhatsapp ?? false;

  const productLines = quote.lines.filter((line) => line.itemType === "producto" || line.itemType === "adn");
  const gestionLines = quote.lines.filter((line) => line.itemType === "gestion");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t.implementationTitle}</h3>
        <div className="mt-2 divide-y divide-border-subtle">
          {quote.mode === "pkg" && packageName ? (
            <LineRow name={packageName} amount={quote.packageQuotedPrice ?? 0} />
          ) : null}
          {quote.mode === "pkg" && adnName ? (
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs text-text-muted">
              <span>{t.adnIncludedLabel}</span>
              <span>{adnName}</span>
            </div>
          ) : null}
          {productLines.map((line) => (
            <LineRow key={line.id} name={line.itemName} amount={line.quotedPrice} />
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-1 border-t border-border-subtle pt-3">
          {quote.precioEspecial !== null ? (
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{t.subtotalLabel}</span>
              <MoneyValue amount={quote.subtotal} />
            </div>
          ) : null}
          <div className="flex items-center justify-between text-base font-semibold text-text-primary">
            <span>{quote.precioEspecial !== null ? t.specialPriceLabel : t.totalLabel}</span>
            <MoneyValue amount={quote.total} />
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{t.initialPaymentLabel}</span>
            <MoneyValue amount={quote.pagoInicial} />
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{t.deferredPaymentLabel(quote.mesesDiferimiento)}</span>
            <MoneyValue amount={quote.pagoDiferidoMensual} />
          </div>
        </div>
      </div>

      {gestionLines.length > 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
          <h3 className="text-sm font-semibold text-text-primary">{t.gestionTitle}</h3>
          <p className="text-xs text-text-muted">{t.gestionHint}</p>
          <div className="mt-2 divide-y divide-border-subtle">
            {gestionLines.map((line) => (
              <LineRow key={line.id} name={line.itemName} amount={line.quotedPrice} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-sunken p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t.platformTitle}</h3>
        <p className="text-xs text-text-muted">{t.platformHint}</p>
        <div className="mt-2 divide-y divide-border-subtle">
          <LineRow name={planName} amount={quote.platformPlanPrice} currency="USD" />
          <LineRow name={consumoName} amount={quote.platformConsumoPrice} currency="USD" />
          <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 flex-1 text-text-secondary">{t.whatsappLabel}</span>
            {planIncludesWhatsapp ? (
              <span className="text-xs text-text-muted">{t.platformWhatsappIncluded}</span>
            ) : quote.platformWhatsappPrice !== null ? (
              <MoneyValue amount={quote.platformWhatsappPrice} currency="USD" />
            ) : (
              <span className="text-xs text-text-muted">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
