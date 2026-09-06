/**
 * Claves de app_settings para los links de pago de Stripe.
 *
 * "stripe_link." + el id real de PACKAGES (src/config/pricing.ts) — nunca se
 * transcribe la clave completa a mano en ningún lado (seed, trigger, hook,
 * componente): una clave que se calcula no se puede desincronizar del
 * catálogo si un id de paquete cambia.
 */

import { PACKAGES } from "./pricing";

export function stripeLinkKey(packageId: string): string {
  return `stripe_link.${packageId}`;
}

export const STRIPE_LINK_KEYS: string[] = PACKAGES.map((pkg) => stripeLinkKey(pkg.id));
