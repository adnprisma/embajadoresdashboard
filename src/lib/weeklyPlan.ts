import { addDays, isWeekend, nextMonday, startOfDay, startOfWeek } from "date-fns";
import type { ContactRow } from "@/lib/queries/contacts";
import type { ProspectAnalysisRow } from "@/lib/queries/prospectAnalysis";

export const TASKS_PER_DAY = 10;

/**
 * Días hábiles restantes de la semana en curso, empezando en HOY (lunes es
 * la semana completa: 5 días). Si hoy es sábado o domingo, no quedan días
 * hábiles en la semana en curso — se reparte sobre la semana SIGUIENTE
 * completa, igual que haría cualquiera planeando el fin de semana.
 */
export function remainingBusinessDays(now: Date): Date[] {
  const today = startOfDay(now);

  if (isWeekend(today)) {
    const monday = startOfDay(nextMonday(today));
    return [0, 1, 2, 3, 4].map((n) => addDays(monday, n));
  }

  const friday = addDays(startOfWeek(today, { weekStartsOn: 1 }), 4);
  const days: Date[] = [];
  let cursor = today;
  while (cursor <= friday) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export type WeeklyPlanCandidate = {
  contactId: string;
  businessName: string;
  colonia: string | null;
  score: number | null;
  isUrgent: boolean | null;
  // null = sin dato (gaps vino null o vacío) — nunca se pinta como 0. Mismo
  // criterio que la vista Comparativa de /contactos.
  gapsCount: number | null;
};

/**
 * Candidatos = contactos del usuario con análisis de prospección, sin tarea
 * ABIERTA y sin ninguna oportunidad en el pipeline (cualquier etapa).
 * Orden idéntico a la vista Comparativa: score descendente y, a empate, más
 * carencias primero — para que la prioridad se lea igual en las dos
 * pantallas.
 */
export function buildWeeklyPlanCandidates(
  contacts: ContactRow[],
  analysisByContactId: Map<string, ProspectAnalysisRow>,
  contactIdsWithOpenTask: Set<string>,
  contactIdsWithOpportunity: Set<string>,
): WeeklyPlanCandidate[] {
  const candidates: WeeklyPlanCandidate[] = [];

  for (const contact of contacts) {
    const analysis = analysisByContactId.get(contact.id);
    if (!analysis) continue;
    if (contactIdsWithOpenTask.has(contact.id)) continue;
    if (contactIdsWithOpportunity.has(contact.id)) continue;

    candidates.push({
      contactId: contact.id,
      businessName: contact.business_name,
      colonia: analysis.colonia,
      score: analysis.score,
      isUrgent: analysis.is_urgent,
      gapsCount: analysis.gaps && analysis.gaps.length > 0 ? analysis.gaps.length : null,
    });
  }

  candidates.sort((a, b) => {
    const scoreDelta = (b.score ?? -1) - (a.score ?? -1);
    if (scoreDelta !== 0) return scoreDelta;
    return (b.gapsCount ?? 0) - (a.gapsCount ?? 0);
  });

  return candidates;
}

export type WeeklyPlanDay = {
  date: Date;
  candidates: WeeklyPlanCandidate[];
};

/**
 * Reparte TASKS_PER_DAY candidatos por día, en el orden ya calculado. Si
 * hay menos candidatos que espacios, los días de más quedan con menos (o
 * vacíos) — nunca se rellena con un candidato repetido o ya trabajado. Si
 * hay más candidatos que espacios totales, los que sobran no se proponen
 * esta semana (siguen sin tarea, así que vuelven a salir la próxima vez que
 * se genere el plan).
 */
export function distributeIntoDays(candidates: WeeklyPlanCandidate[], days: Date[]): WeeklyPlanDay[] {
  const result: WeeklyPlanDay[] = days.map((date) => ({ date, candidates: [] }));

  candidates.forEach((candidate, index) => {
    const dayIndex = Math.floor(index / TASKS_PER_DAY);
    const day = result[dayIndex];
    if (!day) return;
    day.candidates.push(candidate);
  });

  return result;
}
