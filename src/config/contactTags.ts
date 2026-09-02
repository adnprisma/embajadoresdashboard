// Etiquetas operativas: lista cerrada, se aplican desde botón/menú, nunca a
// mano. Conviven en la misma columna `contacts.tags` que las etiquetas de
// alcaldía (texto libre) — esta lista es la única forma de distinguir unas
// de otras, porque la base no las separa.
export const OPERATIONAL_TAGS = ["visitar"] as const;

export type OperationalTag = (typeof OPERATIONAL_TAGS)[number];

export function isOperationalTag(tag: string): tag is OperationalTag {
  return (OPERATIONAL_TAGS as readonly string[]).includes(tag);
}
