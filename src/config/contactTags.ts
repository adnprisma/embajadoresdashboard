// Etiquetas operativas: lista cerrada, se aplican desde botón/menú, nunca a
// mano. Conviven en la misma columna `contacts.tags` que las etiquetas de
// alcaldía (texto libre) — esta lista es la única forma de distinguir unas
// de otras, porque la base no las separa.
//
// "lote-sep-2026": etiqueta de LOTE, no de estado — marca de qué carga
// salió un contacto, no qué hacer con él. A propósito no se llama "nuevos":
// en dos meses no dice nada, y el siguiente lote se le encima. Aplicada al
// grupo con teléfono válido del lote de veterinarias del 2 de septiembre de
// 2026 (ver bitácora de reparto).
// "posible-duplicado": rastreo manual — un contacto de reserva que coincide
// por nombre (no por teléfono) con uno ya asignado a otra vendedora. No se
// resuelve solo con la etiqueta; alguien tiene que verificar al contactarlo
// si es el mismo negocio o una sucursal distinta.
//
// "telefono-revisar": el número tal cual está capturado no va a marcar
// (prefijo de larga distancia viejo, lada fuera de CDMX, etc.) — revisar
// antes de intentar la llamada, no se borra el contacto por esto.
//
// "linea-compartida" vs "misma-marca" — dos etiquetas separadas a propósito,
// no una: describen hechos distintos y un contacto puede tener las dos.
// "linea-compartida" SOLO cuando el teléfono normalizado es idéntico al de
// otro contacto (misma línea física — la vendedora ya marcó ese número).
// "misma-marca" cuando se repite nombre de cadena o de doctor/a — puede ser
// con líneas distintas (otra sucursal real, no la misma llamada) O con la
// misma línea compartida entre sucursales; las dos etiquetas no son
// excluyentes. Caso real: las tres sucursales de "Dr. Dentista" en
// Iztacalco (Coruña, Ramos Tlacotal, Recreo) comparten el teléfono
// +52 55 6333 6308 y llevan las DOS etiquetas a propósito —
// "misma-marca" porque es cadena y puede haber más sucursales en otro
// lado, "linea-compartida" porque ese número específico ya se marcó
// (verificado el 12 de septiembre de 2026, reparto a Filiberto). La
// advertencia que sigue vigente: nunca poner "linea-compartida" a una
// sucursal con línea PROPIA solo por pertenecer a una cadena — eso sí le
// dice a la vendedora algo falso ("ya marcaste esto") y una etiqueta que
// miente se deja de leer — de ahí la separación original (lote de
// dentistas, 2026-09-07).
export const OPERATIONAL_TAGS = [
  "visitar",
  "lote-sep-2026",
  "posible-duplicado",
  "linea-compartida",
  "misma-marca",
  "telefono-revisar",
] as const;

export type OperationalTag = (typeof OPERATIONAL_TAGS)[number];

export function isOperationalTag(tag: string): tag is OperationalTag {
  return (OPERATIONAL_TAGS as readonly string[]).includes(tag);
}
