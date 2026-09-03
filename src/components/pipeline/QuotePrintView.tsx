import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
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
import { cn } from "@/lib/utils/cn";

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

// Formateador propio, distinto de <MoneyValue> (que siempre muestra .00):
// en un documento, "$47,500" se lee mejor que "$47,500.00" — los centavos
// se quedan solo donde hay fracción real (el diferido mensual). MoneyValue
// no cambia: esta regla es de documento, no de interfaz.
function formatMoney(amount: number, currency: "MXN" | "USD" = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// print-color-adjust (+ prefijo -webkit-): sin esto el navegador descarta
// los fondos de color al imprimir (encabezado carbón, cajas de nota en
// beige) aunque estén declarados — es la causa real de que una primera
// versión sin esto se viera plana en la impresión de prueba. Solo va en
// los DOS elementos que dependen de un fondo para leerse — el texto
// (títulos de sección, el total) imprime igual sin esta propiedad, no
// hace falta repetirla ahí.
const FORCE_PRINT_COLOR = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as const;

// Título en carbón + regla coral debajo, no coral en el texto — coral sobre
// blanco a 14px da ~3.1:1, por debajo del 4.5:1 que pide un título de
// cuerpo (ver DESIGN_SYSTEM.md §3: coral sobre blanco solo sirve para texto
// ≥24px o como elemento gráfico, nunca texto de cuerpo pequeño). El acento
// de marca se queda en el borde, que es "borde de acento" — sí permitido.
// break-after-avoid: nunca se queda solo al final de una página con su
// contenido empujado a la siguiente.
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="break-after-avoid border-b-2 border-accent pb-1.5 text-sm font-bold uppercase tracking-wide text-text-primary">
      {children}
    </h2>
  );
}

// Un nivel entre el título de sección y un ítem: tamaño y peso propios
// (16px/bold) para que "Paquete Completo" o "Elementos adicionales" no se
// confundan con un producto más de la lista. break-after-avoid por la misma
// razón que en SectionTitle.
function SubTitle({ children }: { children: ReactNode }) {
  return <p className="break-after-avoid text-base font-bold text-text-primary">{children}</p>;
}

// Nombre y descripción apilados (no en la misma línea): así una descripción
// larga que envuelve a dos renglones se queda debajo del nombre, no
// mezclada con el siguiente producto — sigue leyéndose como un solo ítem
// sin necesitar sangría especial. El espacio ENTRE ítems (gap-4 en el
// contenedor) es mayor que el espacio DENTRO de uno (mt-0.5 aquí) a
// propósito: es lo que separa un renglón denso de una lista que se puede
// escanear. break-inside-avoid vive aquí, en la pieza atómica — no en la
// sección completa que la contiene: una sección larga sí debe poder
// partirse entre páginas, un producto individual no.
function IncludeRow({ name, description }: { name: string; description: string }) {
  return (
    <div className="break-inside-avoid">
      <p className="text-sm font-semibold text-text-primary">{name}</p>
      <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function NoteBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p
      style={FORCE_PRINT_COLOR}
      className="break-inside-avoid rounded-r-[var(--radius-control)] border-l-4 border-accent bg-bg-sunken p-4 text-xs text-text-secondary"
    >
      <span className="font-semibold text-text-primary">{label}: </span>
      {children}
    </p>
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
    <div
      className={cn(
        "mx-auto flex max-w-[800px] flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface shadow-[var(--shadow-card)]",
        "print:max-w-none print:rounded-none print:border-0 print:shadow-none",
      )}
    >
      <header
        style={FORCE_PRINT_COLOR}
        className="flex flex-col gap-1.5 bg-carbon px-8 py-8 text-center break-inside-avoid"
      >
        <span className="font-[var(--font-display)] text-sm font-semibold tracking-[0.08em] text-text-on-dark/70 uppercase">
          {BRAND.name}
        </span>
        <h1 className="text-2xl font-bold text-text-on-dark">{t.proposalTitle(clientName)}</h1>
        <p className="text-sm text-text-on-dark/70">
          {[giro, format(parseISO(quote.createdAt), "d 'de' MMMM 'de' yyyy", { locale: es })]
            .filter(Boolean)
            .join(" · ")}
          {embajadorName ? ` · ${t.embajadorLabel(embajadorName)}` : ""}
        </p>
      </header>

      {/* gap-10 entre secciones, no gap-12: en la ronda anterior "más aire"
      se pasó de generoso — con un documento de 14+ productos eso solo por
      sí solo empujaba el total a tres páginas. La distinción de jerarquía
      (sección > subtítulo > ítem) se sostiene con el break-after-avoid de
      los títulos, no con más espacio del necesario.
      print:pb-4 en vez de py-10 completo: el padding inferior generoso
      pensado para pantalla es lo que dejaba media página 2 en blanco antes
      del pie — en impreso el pie solo necesita el mínimo que lo separe del
      contenido, no el mismo aire. */}
      <div className="flex flex-col gap-10 px-8 py-10 print:pb-4">
        {/* Sin break-inside-avoid aquí: "Qué incluye" puede tener 14+
        productos y NO cabe completa en una sola página — forzarla a no
        partirse es lo que empuja toda la sección a la página siguiente y
        deja la primera casi vacía. Partir una sección larga entre páginas
        es normal en un documento; lo que no debe partirse es cada producto
        individual (ver IncludeRow). */}
        <section className="flex flex-col gap-5">
          <SectionTitle>{t.whatIncludesTitle}</SectionTitle>
          {pkg ? (
            <div className="flex flex-col gap-2">
              <SubTitle>{t.packageLabel(pkg.name)}</SubTitle>
              <div className="flex flex-col gap-4">
                {includedProducts.map((product) => (
                  <IncludeRow key={product.id} name={product.name} description={product.description} />
                ))}
                {includedAdn ? <IncludeRow name={includedAdn.name} description={includedAdn.description} /> : null}
              </div>
            </div>
          ) : null}
          {productAdnLines.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pkg ? <SubTitle>{t.extraItemsTitle}</SubTitle> : null}
              <div className="flex flex-col gap-4">
                {productAdnLines.map((line) => (
                  <IncludeRow
                    key={line.id}
                    name={line.itemName}
                    description={resolveDescription(line.itemType, line.itemId)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {gestionLines.length > 0 ? (
          <section className="flex flex-col gap-2">
            <SectionTitle>{t.gestionTitle}</SectionTitle>
            <div className="flex flex-col gap-4">
              {gestionLines.map((line) => (
                <IncludeRow
                  key={line.id}
                  name={t.gestionItemLabel(line.itemName, formatMoney(line.quotedPrice))}
                  description={resolveDescription(line.itemType, line.itemId)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <SectionTitle>{t.investmentTitle}</SectionTitle>
          {/* break-inside-avoid en la tabla, no en la sección: el total y
          los renglones de pago sí son una pieza atómica — verse partidos
          entre el total y "pago inicial" se ve mal. Las notas de abajo ya
          traen su propio break-inside-avoid vía NoteBox. */}
          <table className="w-full break-inside-avoid text-sm">
            <tbody>
              <tr className="border-b border-border-subtle">
                <td className="py-2.5 font-semibold text-text-primary">{t.implementationLabel}</td>
                <td className="numeric py-2.5 text-right text-2xl font-bold text-accent">
                  {formatMoney(quote.total)}
                </td>
              </tr>
              <tr className="border-b border-border-subtle">
                <td className="py-2 text-text-secondary">{t.initialPaymentLabel}</td>
                <td className="numeric py-2 text-right text-text-primary">{formatMoney(quote.pagoInicial)}</td>
              </tr>
              <tr>
                <td className="py-2 text-text-secondary">{t.deferredPaymentLabel(quote.mesesDiferimiento)}</td>
                <td className="numeric py-2 text-right text-text-primary">
                  {formatMoney(quote.pagoDiferidoMensual)}
                </td>
              </tr>
            </tbody>
          </table>

          <NoteBox label={t.platformNoteLabel}>
            {"~"}
            <span className="numeric">{formatMoney(platformTotal, "USD")}</span>
            /mes ({plan?.name}
            {plan?.includesWhatsapp
              ? ` · ${t.platformIncludesWhatsapp}`
              : quote.platformWhatsappPrice !== null
                ? ` ${t.platformWithWhatsapp}`
                : ` ${t.platformWithoutWhatsapp}`}{" "}
            {t.platformConsumption} {consumo?.name}). {t.platformNoteDescription}
          </NoteBox>

          {gestionLines.length > 0 ? (
            <NoteBox label={t.gestionNoteLabel}>
              {"~"}
              <span className="numeric">{formatMoney(gestionTotal)}</span>
              /mes {t.gestionNoteDescription}
            </NoteBox>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <SectionTitle>{t.howPaymentWorksTitle}</SectionTitle>
            <p className="text-sm text-text-secondary">{t.howPaymentWorks}</p>
          </div>
          <NoteBox label={t.guaranteeLabel}>{t.guarantee}</NoteBox>
        </section>
      </div>

      {/* Sin break-inside-avoid: es una sola línea, ya es indivisible por
      naturaleza — forzarlo no ayuda a que quepa, solo lo trataba como
      bloque aparte. print:py-1: el pie no necesita el mismo aire que en
      pantalla, solo separarse del contenido. */}
      <footer className="border-t border-border-subtle px-8 py-3 text-center text-[11px] text-text-muted print:py-1">
        {t.footer}
      </footer>
    </div>
  );
}
