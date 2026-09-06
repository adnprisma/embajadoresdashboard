/**
 * Claves de app_settings para los links de pago de Stripe.
 *
 * "stripe_link." + modalidad + "." + el id real de PACKAGES
 * (src/config/pricing.ts) — nunca se transcribe la clave completa a mano en
 * ningún lado (seed, trigger, hook, componente): una clave que se calcula no
 * se puede desincronizar del catálogo si un id de paquete cambia.
 *
 * Tres modalidades por paquete, no una: contado (pago único), plan-3 (plan a
 * 3 meses) y plan-6 (plan a 6 meses) — 9 links en total. El trigger
 * (0026/0027) valida por prefijo 'stripe_link.%', así que agregar o quitar
 * una modalidad aquí nunca requiere tocarlo.
 */

import { PACKAGES } from "./pricing";

export type PaymentModality = "contado" | "plan-3" | "plan-6";

export const PAYMENT_MODALITIES: readonly PaymentModality[] = ["contado", "plan-3", "plan-6"];

export function stripeLinkKey(modality: PaymentModality, packageId: string): string {
  return `stripe_link.${modality}.${packageId}`;
}

export const STRIPE_LINK_KEYS: string[] = PAYMENT_MODALITIES.flatMap((modality) =>
  PACKAGES.map((pkg) => stripeLinkKey(modality, pkg.id)),
);
