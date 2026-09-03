import { notFound } from "next/navigation";
import { QuotePrintBar } from "@/components/pipeline/QuotePrintBar";
import { QuotePrintView } from "@/components/pipeline/QuotePrintView";
import type { Quote, QuoteLineItemType } from "@/lib/queries/quotes";
import { createClient } from "@/lib/supabase/server";

const OPPORTUNITY_SELECT = "business_name, contact_id, contacts(business_name, industry), profiles(full_name)";

type OpportunityQueryRow = {
  business_name: string;
  contact_id: string | null;
  contacts: { business_name: string; industry: string | null } | { business_name: string; industry: string | null }[] | null;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

const QUOTE_SELECT =
  "id, created_at, mode, package_id, package_quoted_price, package_adn_tier_id, meses_diferimiento, whatsapp_incluido, platform_plan_id, platform_plan_price, platform_consumo_id, platform_consumo_price, platform_whatsapp_price, precio_especial, subtotal, total, pago_inicial, pago_diferido_mensual, mrr, quote_line_items(id, item_type, item_id, item_name, quoted_price)";

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
  quote_line_items: { id: string; item_type: QuoteLineItemType; item_id: string; item_name: string; quoted_price: number }[];
};

// Sigue detrás de sesión — quien la abre es la vendedora, nunca el cliente
// directo. Si algún día hace falta un enlace público, es otra conversación
// con otras implicaciones de seguridad, no una extensión de esta ruta.
export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id, quoteId } = await params;
  const supabase = await createClient();

  const [{ data: opportunity, error: opportunityError }, { data: quoteRow, error: quoteError }] = await Promise.all([
    supabase.from("opportunities").select(OPPORTUNITY_SELECT).eq("id", id).single(),
    supabase.from("quotes").select(QUOTE_SELECT).eq("id", quoteId).eq("opportunity_id", id).single(),
  ]);

  if (opportunityError || !opportunity || quoteError || !quoteRow) {
    notFound();
  }

  const opportunityRow = opportunity as unknown as OpportunityQueryRow;
  const contact = Array.isArray(opportunityRow.contacts) ? opportunityRow.contacts[0] : opportunityRow.contacts;
  const owner = Array.isArray(opportunityRow.profiles) ? opportunityRow.profiles[0] : opportunityRow.profiles;

  const row = quoteRow as unknown as QuoteQueryRow;
  const quote: Quote = {
    id: row.id,
    createdAt: row.created_at,
    createdByName: null,
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

  return (
    <div>
      <QuotePrintBar />
      <QuotePrintView
        quote={quote}
        clientName={contact?.business_name ?? opportunityRow.business_name}
        giro={contact?.industry ?? null}
        embajadorName={owner?.full_name ?? null}
      />
    </div>
  );
}
