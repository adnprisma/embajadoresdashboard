import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ReactNode } from "react";
import { Illustration } from "@/components/common/Illustration";
import { BRAND } from "@/config/brand";
import { copy } from "@/config/copy";
import {
  ADN_TIERS,
  GESTION_PLANS,
  PACKAGES,
  PLATFORM_CONSUMPTION_TIERS,
  PLATFORM_PLANS,
  PRODUCT_CATEGORIES,
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

// La categoría de un producto extra (fuera del paquete) se resuelve contra
// PRODUCTS en vivo, igual que la descripción — mismo razonamiento que
// resolveDescription: es metadata de catálogo, no algo que el cliente haya
// leído textual y deba quedar congelado.
function resolveCategoryId(itemType: QuoteLineItemType, itemId: string): string | null {
  if (itemType !== "producto") return null;
  return PRODUCTS.find((p) => p.id === itemId)?.categoryId ?? null;
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
// los fondos de color al imprimir (encabezado carbón, bloque de inversión,
// franja superior, cajas de nota) aunque estén declarados — es la causa
// real de que una primera versión sin esto se viera plana en la impresión
// de prueba. Solo va en los elementos que dependen de un fondo para
// leerse — el texto (títulos de sección) imprime igual sin esta
// propiedad, no hace falta repetirla ahí.
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
// (16px/bold) para que "Paquete Completo" no se confunda con un producto
// más de la lista. break-after-avoid por la misma razón que en SectionTitle.
function SubTitle({ children }: { children: ReactNode }) {
  return <p className="break-after-avoid text-base font-bold text-text-primary">{children}</p>;
}

// Etiqueta fina de categoría — mismo tratamiento que las etiquetas de KPI
// del sistema de diseño (DESIGN_SYSTEM.md §4: mayúsculas, letter-spacing
// 0.06em, 12px). Se usa text-muted (carbón al 65%) y no el 60% literal que
// pide esa sección: tokens.css ya fija 65% como el piso legible (5.1:1 /
// 5.4:1) y pide explícitamente no bajar de ahí.
function CategoryLabel({ children }: { children: ReactNode }) {
  return (
    <p className="break-after-avoid text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
      {children}
    </p>
  );
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

  const productLines = quote.lines.filter((line) => line.itemType === "producto");
  const adnLines = quote.lines.filter((line) => line.itemType === "adn");
  const gestionLines = quote.lines.filter((line) => line.itemType === "gestion");

  // "Qué incluye" agrupado por categoría de catálogo — paquete y extras
  // juntos: al cliente le importa qué frentes le cubres, no si un producto
  // llegó dentro del paquete o se sumó aparte (eso es contabilidad interna
  // de Prisma). Solo aparecen categorías con al menos un producto.
  type CategorizedProduct = { id: string; name: string; description: string; categoryId: string };
  const allProducts: CategorizedProduct[] = [
    ...includedProducts.map((p) => ({ id: p.id, name: p.name, description: p.description, categoryId: p.categoryId })),
    ...productLines.map((line) => ({
      id: line.id,
      name: line.itemName,
      description: resolveDescription("producto", line.itemId),
      categoryId: resolveCategoryId("producto", line.itemId) ?? "",
    })),
  ];
  const productsByCategory = PRODUCT_CATEGORIES.map((category) => ({
    category,
    items: allProducts.filter((p) => p.categoryId === category.id),
  })).filter((group) => group.items.length > 0);

  // El ADN va aparte, al final, con su propia etiqueta — no es un producto
  // de catálogo con categoría, es la capa de marca.
  const adnEntries = [
    ...(includedAdn ? [{ id: includedAdn.id, name: includedAdn.name, description: includedAdn.description }] : []),
    ...adnLines.map((line) => ({
      id: line.id,
      name: line.itemName,
      description: resolveDescription("adn", line.itemId),
    })),
  ];

  const plan = PLATFORM_PLANS.find((p) => p.id === quote.platformPlanId);
  const consumo = PLATFORM_CONSUMPTION_TIERS.find((c) => c.id === quote.platformConsumoId);
  const platformTotal = quote.platformPlanPrice + quote.platformConsumoPrice + (quote.platformWhatsappPrice ?? 0);
  const gestionTotal = gestionLines.reduce((sum, line) => sum + line.quotedPrice, 0);

  return (
    <>
      {/* Franja coral superior — probamos position: fixed para que se
      repitiera en todas las páginas, pero un elemento fixed no reserva
      espacio en el flujo: en la impresión real se encimaba sobre el
      contenido que retomaba en las páginas 2 y 3 (llegó a cortar
      "Formularios de captura"). Esta versión es un bloque normal del
      documento, arriba del todo: aparece una sola vez, en la primera
      página, y ocupa su propio espacio como cualquier otro elemento — sin
      fixed no hay forma de que se encime con nada, el problema deja de
      existir en vez de quedar controlado. */}
      <div aria-hidden="true" style={FORCE_PRINT_COLOR} className="hidden print:block print:h-2 print:bg-accent" />
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
            {pkg ? <SubTitle>{t.packageLabel(pkg.name)}</SubTitle> : null}
            {productsByCategory.map(({ category, items }) => (
              <div key={category.id} className="flex flex-col gap-2">
                <CategoryLabel>{category.name}</CategoryLabel>
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <IncludeRow key={item.id} name={item.name} description={item.description} />
                  ))}
                </div>
              </div>
            ))}
            {adnEntries.length > 0 ? (
              <div className="flex flex-col gap-2">
                <CategoryLabel>{t.adnLabel}</CategoryLabel>
                <div className="flex flex-col gap-4">
                  {adnEntries.map((entry) => (
                    <IncludeRow key={entry.id} name={entry.name} description={entry.description} />
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
            {/* Bloque carbón, no tabla: es lo primero que busca el cliente y
            antes se veía igual que cualquier otro renglón. El total va en
            grande encima; pago inicial y diferido debajo, con menos peso.
            Coral sobre carbón da ~5.6:1 (misma fórmula que "carbón sobre
            coral" en DESIGN_SYSTEM.md §3, el contraste no distingue quién es
            fondo y quién es texto) — válido para texto de cualquier tamaño,
            no solo por ser grande. */}
            <div style={FORCE_PRINT_COLOR} className="break-inside-avoid rounded-[var(--radius-card)] bg-carbon px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-on-dark/60">
                {t.implementationLabel}
              </p>
              <p className="numeric mt-1 text-4xl font-bold text-accent">{formatMoney(quote.total)}</p>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-text-on-dark/15 pt-3 text-xs text-text-on-dark/70">
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t.initialPaymentLabel}</span>
                  <span className="numeric text-text-on-dark">{formatMoney(quote.pagoInicial)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <span>{t.deferredPaymentLabel(quote.mesesDiferimiento)}</span>
                  <span className="numeric text-text-on-dark">{formatMoney(quote.pagoDiferidoMensual)}</span>
                </div>
              </div>
            </div>

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

          {/* La ilustración va al final, no al inicio: arriba y chica se leía
          como un error, no como una decisión, y competía con el encabezado.
          Al cierre funciona como remate visual del documento — sobre
          bg-bg-surface (superficie clara), nunca sobre un fondo oscuro: el
          trazo del kit es carbón con transparencia real y desaparece ahí.
          "planear" (ESC_14: dos personas planeando una campaña en pizarra)
          casa con lo que de verdad se está proponiendo — paquete completo
          más gestión mensual, que es contenido + campañas — no con
          "encontrar" (diferenciación de marca) ni "crear" (producción de
          contenido en sí). size="xl" (280px, bien sobre el mínimo de 80px
          del kit): al ser la última pieza del documento puede pesar más sin
          competir con nada. */}
          <div className="flex justify-center pt-2">
            <Illustration name="planear" size="xl" alt="" />
          </div>
        </div>

        {/* Sin break-inside-avoid: es una sola línea, ya es indivisible por
        naturaleza — forzarlo no ayuda a que quepa, solo lo trataba como
        bloque aparte. print:py-1: el pie no necesita el mismo aire que en
        pantalla, solo separarse del contenido. */}
        <footer className="border-t border-border-subtle px-8 py-3 text-center text-[11px] text-text-muted print:py-1">
          {t.footer}
        </footer>
      </div>
    </>
  );
}
