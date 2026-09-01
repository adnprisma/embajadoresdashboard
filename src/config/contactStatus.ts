// Lista cerrada — igual que el CHECK de contacts.status en
// 0015_contact_status.sql. Un solo lugar, para que agregar/quitar un
// estado nunca quede desincronizado entre la base y el cliente.
export const CONTACT_STATUSES = [
  "sin_contactar",
  "contactado",
  "respondio",
  "interesado",
  "no_interesado",
  "ilocalizable",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

// Estados que ya no son candidatos de prospección — dijo que no, o ya se
// intentó lo suficiente. El plan semanal (src/lib/weeklyPlan.ts) es el
// único lugar que lee esto para excluir candidatos; cualquier pantalla
// futura con la misma necesidad debe importar de aquí, no reinventar la
// lista.
export const TERMINAL_STATUSES: ReadonlySet<ContactStatus> = new Set(["no_interesado", "ilocalizable"]);

// Estados que cuentan como "se llegó a algo" en el embudo semanal (bloque
// 3, weekly_status_funnel() en 0019_weekly_status_funnel.sql) —
// sin_contactar es el default/reset, no una meta alcanzada. El RPC aplica
// el mismo criterio en SQL (to_status <> 'sin_contactar'); si algún día se
// agrega un estado nuevo, hay que revisar los dos lugares.
export const FUNNEL_STATUSES: readonly ContactStatus[] = CONTACT_STATUSES.filter(
  (status) => status !== "sin_contactar",
);

// El color codifica desenlace, no identidad — misma regla que los acentos
// de etapa del pipeline (DESIGN_SYSTEM.md). "Ilocalizable" es neutro, no
// negativo: a diferencia de "no interesado" (una respuesta real), acá no
// hubo respuesta — no es un rechazo, solo un intento sin resultado.
export type ContactStatusTone = "neutral" | "progress" | "positive" | "negative";

export const CONTACT_STATUS_TONE: Record<ContactStatus, ContactStatusTone> = {
  sin_contactar: "neutral",
  ilocalizable: "neutral",
  contactado: "progress",
  respondio: "progress",
  interesado: "positive",
  no_interesado: "negative",
};
