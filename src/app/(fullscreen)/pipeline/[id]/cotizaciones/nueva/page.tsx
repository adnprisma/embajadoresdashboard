import Link from "next/link";
import { notFound } from "next/navigation";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { QuoteWizard } from "./QuoteWizard";

const OPPORTUNITY_SELECT = "id, owner_id, business_name, stage_id, pipeline_stages(is_won, is_lost)";

type OpportunityQueryRow = {
  id: string;
  owner_id: string;
  business_name: string;
  stage_id: string;
  pipeline_stages: { is_won: boolean; is_lost: boolean } | { is_won: boolean; is_lost: boolean }[] | null;
};

// Candado server-side, no solo botón escondido: entrar por URL directa a
// una oportunidad ganada o perdida no debe dejar llenar el wizard completo
// para estrellarse hasta el final con la excepción de generate_quote() (ver
// 0023_quotes.sql) — el mismo criterio se aplica aquí antes de renderizar
// un solo campo. OpportunityDetailView ya oculta el botón de entrada para
// el caso normal de navegación; esto cubre la URL directa.
export default async function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: opportunity, error } = await supabase.from("opportunities").select(OPPORTUNITY_SELECT).eq("id", id).single();

  if (error || !opportunity) {
    notFound();
  }

  const row = opportunity as unknown as OpportunityQueryRow;
  const stage = Array.isArray(row.pipeline_stages) ? row.pipeline_stages[0] : row.pipeline_stages;

  if (stage?.is_won || stage?.is_lost) {
    const t = copy.pipeline.wizard.blocked;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-lg font-semibold text-text-primary">{t.title}</h1>
        <p className="text-sm text-text-secondary">{stage.is_won ? t.won : t.lost}</p>
        <Link
          href={`/pipeline/${id}`}
          className="mt-2 inline-flex items-center rounded-[var(--radius-control)] border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
        >
          {t.backButton}
        </Link>
      </div>
    );
  }

  return <QuoteWizard opportunityId={row.id} ownerId={row.owner_id} businessName={row.business_name} />;
}
