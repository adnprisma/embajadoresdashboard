/**
 * Claves de app_settings para los links de pago de Stripe.
 *
 * "stripe_link." + modalidad + "." + el id real de PACKAGES
 * (src/config/pricing.ts) — nunca se transcribe la clave completa a mano en
 * ningún lado (seed, trigger, hook, componente): una clave que se calcula no
 * se puede desincronizar del catálogo si un id de paquete cambia.
 *
 * Cuatro modalidades por paquete, no una: contado (pago único), plan-3, plan-6
 * y plan-12 (planes a 3/6/12 meses) — 12 links en total (0038 agregó
 * plan-12 a las 9 originales de 0026/0027). El trigger (0026/0027/0038)
 * valida por prefijo 'stripe_link.%', así que agregar o quitar una
 * modalidad aquí nunca requiere tocarlo.
 *
 * El <select> de payment_modality por cliente vive en ClientesView.tsx
 * (0039_platform_referral_owner.sql + este commit) — itera
 * PAYMENT_MODALITIES, nunca una lista escrita a mano, así que agregar una
 * quinta modalidad algún día no exige tocar ese componente.
 *
 * IMPORTANTE — esto NO es lo mismo que `quotes.meses_diferimiento` (cuántas
 * mensualidades tiene UNA cotización después del pago inicial, ver
 * src/lib/quoteMath.ts). Comparten los números 3 y 6 por coincidencia, no
 * por relación: payment_modality decide qué Payment Link de Stripe mostrar
 * en la landing de onboarding; meses_diferimiento es aritmética de una
 * cotización individual, sin tope y sin relación con esta lista. Tocar uno
 * no debe asumirse que mueve el otro.
 */

import { PACKAGES } from "./pricing";

export type PaymentModality = "contado" | "plan-3" | "plan-6" | "plan-12";

export const PAYMENT_MODALITIES: readonly PaymentModality[] = ["contado", "plan-3", "plan-6", "plan-12"];

export function stripeLinkKey(modality: PaymentModality, packageId: string): string {
  return `stripe_link.${modality}.${packageId}`;
}

export const STRIPE_LINK_KEYS: string[] = PAYMENT_MODALITIES.flatMap((modality) =>
  PACKAGES.map((pkg) => stripeLinkKey(modality, pkg.id)),
);

/**
 * Claves de app_settings para los links de referido de plataforma —
 * platform_link.<owner>, 0039_platform_referral_owner.sql. El link es de
 * afiliado: la comisión de esa contratación se acredita a quien sea dueño
 * del link que el cliente usó para darse de alta, así que la elección es
 * manual por cliente (clients.platform_referral_owner), nunca derivada de
 * quién es la vendedora dueña — ver esa migración para el detalle completo.
 *
 * DECISIÓN CONSCIENTE: 'nestor'/'david' son nombres de personas dentro de
 * un tipo de TypeScript, igual que en el check de la base — un tercer
 * dueño de referido exige tocar este archivo Y una migración, no es un
 * dato que se pueda agregar solo. Aceptado mientras sean exactamente dos.
 */
export type PlatformReferralOwner = "nestor" | "david";

export const PLATFORM_REFERRAL_OWNERS: readonly PlatformReferralOwner[] = ["nestor", "david"];

export function platformLinkKey(owner: PlatformReferralOwner): string {
  return `platform_link.${owner}`;
}
