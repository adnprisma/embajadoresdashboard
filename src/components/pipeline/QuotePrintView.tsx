import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { MoneyValue } from "@/components/common/MoneyValue";
import { BRAND } from "@/config/brand";
import { copy } from "@/config/copy";
import {
  ADN_TIERS,
  GESTION_PLANS,
  PACKAGES,
  PLATFORM_CONSUMPTION_TIERS,
  PLATFORM_PLANS,
  PRODUCTS,
} from "@/config/pricing";
import type { Quote, QuoteLineItemType } from "@/lib/queries/quotes";

// Los nombres de cada línea vienen CONGELADOS en quote_line_items — si el
// catálogo renombra un producto después, esta cotización se sigue leyendo
// como se generó. Las DESCRIPCIONES (el texto de venta debajo del nombre)
// NO están congeladas — se resuelven aquí en vivo contra pricing.ts. Es
// asimetría deliberada, no un descuido: el precio y el nombre son lo que
// alguien pudo haber leído y recordar tal cual; la descripción es texto de
// catálogo que rara vez cambia y, si cambia, no hay ningún daño en que una
// cotización vieja muestre la redacción más reciente. No lo "arregles"
// congelando también la descripción sin que alguien lo decida a propósito.
function resolveDescription(itemType: QuoteLineItemType, itemId: string): string {
  if (itemType === "producto") return PRODUCTS.find((p) => p.id === itemId)?.description ?? "";
  if (itemType === "adn") return ADN_TIERS.find((a) => a.id === itemId)?.description ?? "";
  return GESTION_PLANS.find((g) => g.id === itemId)?.description ?? "";
}

function IncludeRow({ name, description }: { name: string; description: string }) {
  return (
    <div className="break-inside-avoid py-1 text-sm">
      <span className="font-semibold text-text-primary">{name}: </span>
      <span className="text-text-secondary">{description}</span>
    </div>
  );
}

export function QuotePrintView({
  quote,
  clientName,
  giro,
  embajadorName,
}: {
  quote: Quote;
  clientName: string;
  giro: string | null;
  embajadorName: string | null;
}) {
  const t = copy.pipeline.print;

  const pkg = quote.packageId ? PACKAGES.find((p) => p.id === quote.packageId) : null;
  const includedProducts = pkg ? PRODUCTS.filter((p) => pkg.includedProductIds.includes(p.id)) : [];
  const includedAdn = quote.packageAdnTierId ? ADN_TIERS.find((a) => a.id === quote.packageAdnTierId) : null;

  const productAdnLines = quote.lines.filter((line) => line.itemType === "producto" || line.itemType === "adn");
  const gestionLines = quote.lines.filter((line) => line.itemType === "gestion");

  const plan = PLATFORM_PLANS.find((p) => p.id === quote.platformPlanId);
  const consumo = PLATFORM_CONSUMPTION_TIERS.find((c) => c.id === quote.platformConsumoId);
  const platformTotal = quote.platformPlanPrice + quote.platformConsumoPrice + (quote.platformWhatsappPrice ?? 0);
  const gestionTotal = gestionLines.reduce((sum, line) => sum + line.quotedPrice, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 bg-white p-8 text-text-primary print:p-0">
      <header className="flex flex-col items-center gap-2 border-b border-border-subtle pb-6 text-center break-inside-avoid">
        <span className="font-[var(--font-display)] text-2xl font-semibold tracking-tight text-text-primary">
          {BRAND.name}
        </span>
        <h1 className="text-xl font-semibold text-text-primary">{t.proposalTitle(clientName)}</h1>
        <p className="text-sm text-text-secondary">
          {[giro, format(parseISO(quote.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })]
            .filter(Boolean)
            .join(" · ")}
          {embajadorName ? ` · ${t.embajadorLabel(embajadorName)}` : ""}
        </p>
      </header>

      <section className="flex flex-col gap-1 break-inside-avoid">
        <h2 className="text-base font-semibold text-text-primary">{t.whatIncludesTitle}</h2>
        {pkg ? (
          <>
            <p className="text-sm font-semibold text-text-primary">{t.packageIncludes(pkg.name)}</p>
            {includedProducts.map((product) => (
              <IncludeRow key={product.id} name={product.name} description={product.description} />
            ))}
            {includedAdn ? <IncludeRow name={includedAdn.name} description={includedAdn.description} /> : null}
          </>
        ) : null}
        {productAdnLines.length > 0 ? (
          <>
            {pkg ? <p className="mt-2 text-sm font-semibold text-text-primary">{t.extraItemsTitle}</p> : null}
            {productAdnLines.map((line) => (
              <IncludeRow key={line.id} name={line.itemName} description={resolveDescription(line.itemType, line.itemId)} />
            ))}
          </>
        ) : null}
      </section>

      {gestionLines.length > 0 ? (
        <section className="flex flex-col gap-1 break-inside-avoid">
          <h2 className="text-base font-semibold text-text-primary">{t.gestionTitle}</h2>
          {gestionLines.map((line) => (
            <IncludeRow
              key={line.id}
              name={t.gestionItemLabel(line.itemName, new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(line.quotedPrice))}
              description={resolveDescription(line.itemType, line.itemId)}
            />
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-2 break-inside-avoid">
        <h2 className="text-base font-semibold text-text-primary">{t.investmentTitle}</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border-subtle">
              <td className="py-2 font-semibold">{t.implementationLabel}</td>
              <td className="py-2 text-right text-lg font-semibold">
                <MoneyValue amount={quote.total} />
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-text-secondary">{t.initialPaymentLabel}</td>
              <td className="py-1.5 text-right">
                <MoneyValue amount={quote.pagoInicial} />
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-text-secondary">{t.deferredPaymentLabel(quote.mesesDiferimiento)}</td>
              <td className="py-1.5 text-right">
                <MoneyValue amount={quote.pagoDiferidoMensual} />
              </td>
            </tr>
          </tbody>
        </table>

        <p className="break-inside-avoid rounded-[var(--radius-control)] border border-border-subtle p-3 text-xs text-text-secondary">
          <span className="font-semibold text-text-primary">{t.platformNoteLabel}: </span>
          {"~"}
          <MoneyValue amount={platformTotal} currency="USD" />/mes ({plan?.name}
          {plan?.includesWhatsapp
            ? ` · ${t.platformIncludesWhatsapp}`
            : quote.platformWhatsappPrice !== null
              ? ` ${t.platformWithWhatsapp}`
              : ` ${t.platformWithoutWhatsapp}`}
          {" "}
          {t.platformConsumption} {consumo?.name}). {t.platformNoteDescription}
        </p>

        {gestionLines.length > 0 ? (
          <p className="break-inside-avoid rounded-[var(--radius-control)] border border-border-subtle p-3 text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{t.gestionNoteLabel}: </span>
            {"~"}
            <MoneyValue amount={gestionTotal} />
            /mes {t.gestionNoteDescription}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 break-inside-avoid text-sm text-text-secondary">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{t.howPaymentWorksTitle}</h2>
          <p>{t.howPaymentWorks}</p>
        </div>
        <div>
          <span className="font-semibold text-text-primary">{t.guaranteeLabel}: </span>
          {t.guarantee}
        </div>
      </section>

      <footer className="break-inside-avoid border-t border-border-subtle pt-4 text-center text-xs text-text-muted">
        {t.footer}
      </footer>
    </div>
  );
}
