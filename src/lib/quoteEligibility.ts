// Réplica deliberada, en un solo lugar, de la condición de
// generate_quote() (supabase/migrations/0023_quotes.sql, relajada en
// 0037_allow_first_quote_on_won_opportunity.sql): perdida nunca admite
// cotización; ganada la admite SOLO si todavía no tiene ninguna
// registrada — es el caso real de una oportunidad que se convirtió a
// cliente antes de cotizar (Vital Titanium, 11 de septiembre de 2026).
//
// Por qué existe este archivo y no dos `if` sueltos: antes de esto, el
// botón de "Nueva cotización" (OpportunityDetailView) y el candado de la
// página del wizard (cotizaciones/nueva/page.tsx) tenían la misma regla
// escrita a mano, cada uno por su cuenta — y se desalinearon en cuanto la
// regla de la base cambió (0037 relajó el RPC, ninguno de los dos se
// enteró). Los dos consumidores importan esta única función en vez de
// repetir la condición.
//
// Espejo, no cálculo — mismo espíritu que quoteMath.ts (que sí espeja
// aritmética), pero esto nunca decide dinero, solo si se ofrece la
// puerta. La base sigue siendo quien de verdad la abre o la cierra: si
// esta función y generate_quote() alguna vez difieren, el peor caso es un
// botón visible que la base rechaza igual (mensaje genérico del RPC), no
// al revés — nunca un botón escondido que la base sí habría dejado pasar.
// Si la condición de generate_quote() vuelve a cambiar, cambia aquí en el
// mismo commit.
export function canGenerateQuote(params: { isWon: boolean; isLost: boolean; hasQuotes: boolean }): boolean {
  if (params.isLost) return false;
  if (params.isWon && params.hasQuotes) return false;
  return true;
}
