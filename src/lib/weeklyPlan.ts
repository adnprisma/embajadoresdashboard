import { addDays, isWeekend, nextMonday, startOfDay, startOfWeek } from "date-fns";
import { TERMINAL_STATUSES } from "@/config/contactStatus";
import type { ContactRow } from "@/lib/queries/contacts";
import type { ProspectAnalysisRow } from "@/lib/queries/prospectAnalysis";

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
 * ABIERTA, sin ninguna oportunidad en el pipeline (cualquier etapa) y sin
 * un estado terminal (no_interesado/ilocalizable — ver
 * src/config/contactStatus.ts, única fuente de esa lista). "Contactado" y
 * "respondió" SÍ siguen siendo candidatos: están en proceso, no cerrados.
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
    // Defensivo: `contacts` ya viene filtrado a los propios de quien pide
    // el plan, así que un contacto en reserva (siempre de un admin) no
    // debería aparecer aquí — salvo que el propio admin visite
    // /plan-semanal, caso para el que sí hace falta este chequeo explícito.
    if (contact.in_reserve) continue;
    const analysis = analysisByContactId.get(contact.id);
    if (!analysis) continue;
    if (contactIdsWithOpenTask.has(contact.id)) continue;
    if (contactIdsWithOpportunity.has(contact.id)) continue;
    if (TERMINAL_STATUSES.has(contact.status)) continue;

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

// Punto de partida editable, no una agenda real — mismo criterio que usa
// supabase/test-data/20-asigna-horas-tareas-existentes.sql para repartir
// las tareas que ya existían, para no tener dos reglas de horario
// distintas conviviendo.
export const TASK_SLOT_START_HOUR = 9;
export const TASK_SLOT_INTERVAL_MINUTES = 30;

// index = posición del candidato dentro de su día (0 = primero). Hora
// local del navegador — igual que remainingBusinessDays(), que ya trabaja
// en tiempo local sin pasar por UTC a propósito.
export function timeForSlot(day: Date, index: number): Date {
  const totalMinutes = TASK_SLOT_START_HOUR * 60 + index * TASK_SLOT_INTERVAL_MINUTES;
  const result = new Date(day);
  result.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
  return result;
}

/**
 * Reparte dailyTarget candidatos por día, en el orden ya calculado. Si hay
 * menos candidatos que espacios, los días de más quedan con menos (o
 * vacíos) — nunca se rellena con un candidato repetido o ya trabajado. Si
 * hay más candidatos que espacios totales, los que sobran no se proponen
 * esta semana (siguen sin tarea, así que vuelven a salir la próxima vez que
 * se genere el plan). dailyTarget viene de profiles.daily_lead_target —
 * configurable por vendedora, ver 0025_daily_lead_target.sql.
 */
export function distributeIntoDays(candidates: WeeklyPlanCandidate[], days: Date[], dailyTarget: number): WeeklyPlanDay[] {
  const result: WeeklyPlanDay[] = days.map((date) => ({ date, candidates: [] }));

  candidates.forEach((candidate, index) => {
    const dayIndex = Math.floor(index / dailyTarget);
    const day = result[dayIndex];
    if (!day) return;
    day.candidates.push(candidate);
  });

  return result;
}
