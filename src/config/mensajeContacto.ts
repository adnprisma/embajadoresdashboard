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
  // Nombre de quien tiene ASIGNADO el contacto (el owner), no de quien está
  // viendo la pantalla — un admin abriendo la ficha de un lead ajeno tiene
  // que ver el mensaje que mandaría esa vendedora, no el suyo.
  ownerFullName: string | null;
  // GIRO del contacto (contacts.industry) — arma la frase de justificación.
  // Ver GIRO_A_FRASE: nunca se pluraliza con una regla automática de
  // español, cada giro real tiene su entrada explícita.
  industry: string | null;
} & Partial<Record<Capacidad, boolean | null>>;

// Un primer mensaje con ocho viñetas no lo lee nadie. Si algún día se
// reclasifica una capacidad a 'nucleo' y suma más de cuatro, se recortan
// aquí — nunca se decide en la pantalla.
const MAX_BULLETS = 4;

// Mapa explícito giro → frase en plural (con ubicación incluida). Agrega
// aquí cada giro real que exista en la base conforme se cargan lotes nuevos
// — no hay regla automática de pluralización.
const GIRO_A_FRASE: Record<string, string> = {
  Veterinaria: "veterinarias en CDMX",
};

const GIRO_FRASE_FALLBACK = "negocios locales en CDMX";

function fraseParaGiro(industry: string | null): string {
  if (!industry) return GIRO_FRASE_FALLBACK;
  return GIRO_A_FRASE[industry] ?? GIRO_FRASE_FALLBACK;
}

/** Arma el mensaje sugerido a partir del contacto y su análisis de prospección. */
export function generarMensajeContacto(input: MensajeContactoInput): string {
  const { mensaje } = copy.contactos.detail.analysisTab;
  const ownerFirstName = input.ownerFullName?.split(" ")[0] ?? null;

  const bullets = ofertaParaCarencias(input)
    .filter((item) => item.alcance === "nucleo")
    .slice(0, MAX_BULLETS)
    .map((item) => `• ${item.propuestaCorta}`)
    .join("\n");

  const blocks = [
    mensaje.greeting(ownerFirstName, input.business_name, input.colonia),
    mensaje.justification(fraseParaGiro(input.industry)),
    bullets || null,
    mensaje.closing,
  ].filter((block): block is string => Boolean(block));

  return blocks.join("\n\n");
}
