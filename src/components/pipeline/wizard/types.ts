// Estado del wizard de captura (bloque 5b) — vive en QuoteWizard.tsx, los
// tres pasos y la barra de total lo leen/mutan vía props, nunca contexto:
// son 3-4 componentes, no vale la pena el indirect de un Context aquí.
export type LineSelection = {
  itemId: string;
  price: number;
};

export type WizardState = {
  mode: "pkg" | "custom";
  packageId: string | null;
  // Precio que la vendedora tecleó para el paquete completo — nunca el de
  // catálogo a secas, aunque arranque prellenado con su propio precio
  // (ver resolveSellerPrice). Independiente de extraProducts/extraAdn.
  packagePrice: number | null;
  // "Elementos adicionales" en modo paquete, o la selección completa en
  // modo personalizada — misma estructura, distinto significado según
  // `mode`. Nunca incluye ids que ya vengan dentro del paquete elegido
  // (ver dedupeAgainstPackage en QuoteWizard).
  extraProducts: LineSelection[];
  extraAdn: LineSelection[];
  // null = "ninguna" — un solo plan de gestión a la vez, nunca los dos.
  gestionId: string | null;
  platformPlanId: string;
  platformConsumoId: string;
  // Se fuerza a true y se deshabilita en la UI cuando el plan elegido ya
  // incluye WhatsApp (Owner+) — ver PLATFORM_PLANS[].includesWhatsapp.
  whatsappIncluded: boolean;
  mesesDiferimiento: number;
  precioEspecial: number | null;
};

// Una línea ya resuelta (nombre incluido) — de aquí salen tanto las líneas
// que se mandan al RPC (sin itemName) como las que alimentan el preview de
// <QuoteBreakdown /> (con itemName, más un id sintético).
export type ResolvedLine = {
  itemType: "producto" | "adn" | "gestion";
  itemId: string;
  itemName: string;
  quotedPrice: number;
};
