// Planes, complementos y precios — se llenan en el bloque 14
// (cotizador y calculadora, context/ROADMAP.md §10.14–10.15).
export type BillingCycle = "monthly" | "annual";

export type PricingPlan = {
  id: string;
  name: string;
  pricePerCycle: Record<BillingCycle, number>;
  recommended: boolean;
  features: string[];
};

export type AddonCategory = {
  id: string;
  name: string;
  icon: string;
  items: {
    id: string;
    name: string;
    pricePerCycle: Record<BillingCycle, number>;
  }[];
};

// TODO(bloque 14): reemplazar con los planes y complementos reales.
export const PRICING_PLANS: PricingPlan[] = [];
export const ADDON_CATEGORIES: AddonCategory[] = [];
