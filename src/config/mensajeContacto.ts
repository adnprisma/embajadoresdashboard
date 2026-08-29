/**
 * Mensaje de WhatsApp sugerido para un prospecto — se GENERA, nunca se
 * guarda. Si se guardara en la base, el día que cambie un texto en
 * oferta.ts quedarían mensajes viejos diciendo algo distinto a lo que ya
 * muestra la pantalla. Siempre se arma al vuelo desde el análisis actual.
 */

import { copy } from "./copy";
import { ofertaParaCarencias, type Capacidad } from "./oferta";

export type MensajeContactoInput = {
  business_name: string;
  colonia: string | null;
  note: string | null;
  // Nombre de quien tiene ASIGNADO el contacto (el owner), no de quien está
  // viendo la pantalla — un admin abriendo la ficha de un lead ajeno tiene
  // que ver el mensaje que mandaría esa vendedora, no el suyo.
  ownerFullName: string | null;
} & Partial<Record<Capacidad, boolean | null>>;

// Un primer mensaje con ocho viñetas no lo lee nadie. Si algún día se
// reclasifica una capacidad a 'nucleo' y suma más de cuatro, se recortan
// aquí — nunca se decide en la pantalla.
const MAX_BULLETS = 4;

/** Arma el mensaje sugerido a partir del contacto y su análisis de prospección. */
export function generarMensajeContacto(input: MensajeContactoInput): string {
  const { mensaje } = copy.contactos.detail.analysisTab;

  const bullets = ofertaParaCarencias(input)
    .filter((item) => item.alcance === "nucleo")
    .slice(0, MAX_BULLETS)
    .map((item) => `• ${item.propuestaCorta}`)
    .join("\n");

  const blocks = [
    mensaje.greeting(input.ownerFullName, input.business_name, input.colonia),
    bullets || null,
    input.note || null,
    mensaje.closing,
  ].filter((block): block is string => Boolean(block));

  return blocks.join("\n\n");
}
