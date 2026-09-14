/**
 * Claves de app_settings para los links de pago de Stripe.
 *
 * "stripe_link." + modalidad + "." + el id real de PACKAGES
 * (src/config/pricing.ts) — nunca se transcribe la clave completa a mano en
 * ningún lado (seed, trigger, hook, componente): una clave que se calcula no
 * se puede desincronizar del catálogo si un id de paquete cambia.
 *
 * Cuatro modalidades, no todas aplican a los tres paquetes por igual:
 * contado, plan-3 y plan-6 sí; plan-12 SOLO aplica a Completo — Inicia y
 * Esencial no tienen versión a 12 meses (regla de negocio confirmada el
 * 14 de septiembre de 2026, ver isModalityAvailableForPackage() abajo y
 * CLAUDE.md). 10 links reales en total, no 12 — el trigger de
 * validate_app_settings() (0026/0027/0038) valida por prefijo
 * 'stripe_link.%', así que agregar/quitar una modalidad o una excepción
 * como esta nunca requiere tocarlo.
 *
 * El <select> de payment_modality por cliente vive en ClientesView.tsx
 * (0039_platform_referral_owner.sql + este commit) — itera
 * PAYMENT_MODALITIES filtrado por isModalityAvailableForPackage(), nunca
 * una lista escrita a mano.
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

// Única fuente de la regla "plan-12 solo aplica a Completo" — consumida
// por STRIPE_LINK_KEYS (abajo), el panel de /datos-de-pago y el <select>
// de payment_modality en ClientesView.tsx. Nunca se repite la condición
// en ninguno de los tres — si el día de mañana Inicia o Esencial ganan
// una versión a 12 meses, o aparece una quinta modalidad con su propia
// excepción, este es el único lugar que cambia.
//
// packageId puede ser null (cliente sin cotización todavía, ver
// ClientRow.latest_quote_package_id): null !== "paquete-completo" es
// false para cualquier chequeo de igualdad, así que un cliente sin
// cotización nunca ve plan-12 como opción — no se ofrece de más antes de
// saber qué paquete se cotizó.
export function isModalityAvailableForPackage(modality: PaymentModality, packageId: string | null): boolean {
  return modality !== "plan-12" || packageId === "paquete-completo";
}

export const STRIPE_LINK_KEYS: string[] = PAYMENT_MODALITIES.flatMap((modality) =>
  PACKAGES.filter((pkg) => isModalityAvailableForPackage(modality, pkg.id)).map((pkg) => stripeLinkKey(modality, pkg.id)),
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
