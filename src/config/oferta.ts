// ---------------------------------------------------------------
// Propuesta de Prisma, mapeada por carencia — NO por prospecto.
//
// La ficha de cada contacto arma su lista de "Oportunidades" cruzando las
// 7 capacidades de prospect_analysis (has_web..has_redes) contra este
// mapa: si una capacidad es false o null (ausente o parcial), su entrada
// aquí aparece como oportunidad. Cambiar la oferta de Prisma es editar
// este archivo una vez — se refleja en los 104 registros a la vez, no hay
// que tocar la base de datos.
//
// A propósito NO se guardó "lo que Digital Owner System le da" (la
// plantilla de la fuente original) en prospect_analysis: es texto de otra
// marca repetido en cada fila, no dato del prospecto. Ver
// CLAUDE.md / migración 0012_prospect_analysis_capacidades.sql.
//
// Textos marcador — Nestor los reemplaza con la propuesta real de Prisma.
// ---------------------------------------------------------------

export type CapabilityKey =
  | "has_web"
  | "has_whatsapp"
  | "has_reservas"
  | "has_crm"
  | "has_chat"
  | "has_blog"
  | "has_redes";

// Solo el texto de la oferta — la etiqueta de cada capacidad (nombre
// visible en la rejilla y en esta lista) vive en copy.ts
// (contactos.detail.analysisTab.capabilities), no aquí, para no tener dos
// fuentes del mismo string visible.
export const OFERTA_PRISMA: Record<CapabilityKey, { propuesta: string }> = {
  has_web: { propuesta: "[TODO: qué ofrece Prisma para web propia]" },
  has_whatsapp: { propuesta: "[TODO: qué ofrece Prisma para WhatsApp]" },
  has_reservas: { propuesta: "[TODO: qué ofrece Prisma para reservas online]" },
  has_crm: { propuesta: "[TODO: qué ofrece Prisma para CRM]" },
  has_chat: { propuesta: "[TODO: qué ofrece Prisma para chat en vivo]" },
  has_blog: { propuesta: "[TODO: qué ofrece Prisma para blog]" },
  has_redes: { propuesta: "[TODO: qué ofrece Prisma para redes sociales]" },
};

// Orden fijo en el que se recorren las 7 capacidades — el mismo orden de
// la tabla comparativa de origen y de la rejilla de la pestaña "Análisis".
export const CAPABILITY_ORDER: CapabilityKey[] = [
  "has_web",
  "has_whatsapp",
  "has_reservas",
  "has_crm",
  "has_chat",
  "has_blog",
  "has_redes",
];

// false o null (ausente o presencia parcial) cuentan como oportunidad —
// solo true (capacidad ya cubierta) queda fuera de la lista. Devuelve la
// key en vez del texto: el caller la resuelve contra copy.ts para la
// etiqueta visible y aquí solo para la propuesta.
export function getOpportunities(capabilities: Partial<Record<CapabilityKey, boolean | null>>) {
  return CAPABILITY_ORDER.filter((key) => capabilities[key] !== true).map((key) => ({
    key,
    propuesta: OFERTA_PRISMA[key].propuesta,
  }));
}
