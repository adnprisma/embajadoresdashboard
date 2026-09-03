// Catálogo maestro de Prisma — bloque 1 (context/ROADMAP.md §10.14).
//
// Los ids de este archivo quedan grabados para siempre en seller_prices,
// seller_price_changes, quotes y quote_line_items (bloques 2-5). Cambiar un
// id después de que exista una sola fila real que lo referencie significa
// reescribir datos históricos, no refactorizar código — por eso son
// legibles y estables (slugs), nunca el índice numérico del HTML de
// referencia.
//
// Precios tomados literalmente de Cotizador_Prisma.html (fuente: carpeta de
// leads del 2 de septiembre). Sin verificar contra lo que Prisma cobra hoy —
// ese archivo puede tener precios viejos. Pendiente de confirmación cifra
// por cifra antes de que el bloque 2 construya encima.

export type ProductCategory = {
  id: string;
  name: string;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: "cat-automatizacion", name: "Automatización y seguimiento" },
  { id: "cat-agendamiento", name: "Agendamiento y reservas" },
  { id: "cat-comunicacion", name: "Comunicación y mensajería" },
  { id: "cat-crm", name: "CRM y pipeline" },
  { id: "cat-presencia-digital", name: "Presencia digital" },
  { id: "cat-cursos-membresias", name: "Cursos y membresías" },
];

export type CatalogProduct = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  description: string;
  featured: boolean;
};

export const PRODUCTS: CatalogProduct[] = [
  { id: "producto-bienvenida", categoryId: "cat-automatizacion", name: "Flujo de bienvenida a nuevos clientes", price: 1800, description: "Un mensaje automático de bienvenida apenas alguien deja sus datos.", featured: false },
  { id: "producto-reactivacion-inactivos", categoryId: "cat-automatizacion", name: "Reactivación de clientes inactivos", price: 2000, description: "Recupera a los clientes que dejaron de venir.", featured: false },
  { id: "producto-missed-call", categoryId: "cat-automatizacion", name: "Missed Call Text Back", price: 1200, description: "Si no contestas una llamada, manda un SMS al instante.", featured: false },
  { id: "producto-seguimiento-post-servicio", categoryId: "cat-automatizacion", name: "Seguimiento post-servicio", price: 2000, description: "Mensaje automático después de atender al cliente.", featured: false },
  { id: "producto-reactivacion-temporada", categoryId: "cat-automatizacion", name: "Reactivación por temporada", price: 1800, description: "Campañas atadas a fechas clave del año.", featured: false },
  { id: "producto-referidos", categoryId: "cat-automatizacion", name: "Programa de referidos", price: 2500, description: "Convierte a clientes felices en recomendaciones.", featured: false },
  { id: "producto-reservas-basico", categoryId: "cat-agendamiento", name: "Reservas online básico", price: 2000, description: "El cliente agenda solo desde un link.", featured: true },
  { id: "producto-reservas-avanzado", categoryId: "cat-agendamiento", name: "Reservas avanzado (multi-servicio)", price: 4000, description: "Reservas con varios servicios, empleados y anticipo.", featured: false },
  { id: "producto-anti-noshows", categoryId: "cat-agendamiento", name: "Flujo anti no-shows", price: 2000, description: "Recordatorios para que no falten a la cita.", featured: false },
  { id: "producto-bandeja-unificada", categoryId: "cat-comunicacion", name: "Bandeja unificada", price: 1800, description: "Todos los mensajes (WhatsApp, Instagram, Facebook) en un solo lugar.", featured: false },
  { id: "producto-email-marketing", categoryId: "cat-comunicacion", name: "Email Marketing", price: 2000, description: "Campañas de correo a tu base de clientes.", featured: false },
  { id: "producto-sms-marketing", categoryId: "cat-comunicacion", name: "SMS Marketing", price: 1500, description: "Campañas por mensaje de texto.", featured: false },
  { id: "producto-ia-conversacional-basico", categoryId: "cat-comunicacion", name: "Agente de IA conversacional básico", price: 3000, description: "Un asistente que contesta solo por WhatsApp, Instagram y Facebook.", featured: true },
  { id: "producto-ia-conversacional-avanzado", categoryId: "cat-comunicacion", name: "Agente de IA conversacional avanzado", price: 5000, description: "Agente que además califica, da seguimiento y guía la venta.", featured: false },
  { id: "producto-ia-voz-basico", categoryId: "cat-comunicacion", name: "Agente de IA por voz básico", price: 4000, description: "Contesta llamadas hablando y capta datos.", featured: false },
  { id: "producto-ia-voz-avanzado", categoryId: "cat-comunicacion", name: "Agente de IA por voz avanzado", price: 6500, description: "Agente telefónico que agenda y resuelve en la llamada.", featured: false },
  { id: "producto-crm-pipeline", categoryId: "cat-crm", name: "CRM / pipeline personalizado", price: 2500, description: "Ordena a cada prospecto y cliente para que ninguno se pierda.", featured: true },
  { id: "producto-importacion-base", categoryId: "cat-crm", name: "Importación y limpieza de base", price: 1500, description: "Sube y ordena tu base de contactos actual.", featured: false },
  { id: "producto-formularios-captura", categoryId: "cat-crm", name: "Formularios de captura", price: 1800, description: "Formularios que capturan prospectos directo al CRM.", featured: false },
  { id: "producto-cotizaciones-invoices", categoryId: "cat-crm", name: "Cotizaciones e invoices", price: 2500, description: "Cotizar y cobrar desde el mismo sistema.", featured: false },
  { id: "producto-sitio-web-basico", categoryId: "cat-presencia-digital", name: "Sitio web básico", price: 5000, description: "Un sitio profesional de hasta 5 páginas conectado al sistema.", featured: false },
  { id: "producto-landing-page", categoryId: "cat-presencia-digital", name: "Landing page de captura", price: 3000, description: "Página enfocada en captar prospectos.", featured: false },
  { id: "producto-resenas-google", categoryId: "cat-presencia-digital", name: "Reseñas de Google automáticas", price: 2000, description: "Pide reseñas solo para mejorar tu reputación.", featured: true },
  { id: "producto-social-media-planner", categoryId: "cat-presencia-digital", name: "Social Media Planner", price: 2500, description: "Programa tus publicaciones de redes.", featured: false },
  { id: "producto-funnel-leads", categoryId: "cat-presencia-digital", name: "Funnel de captación de leads", price: 6000, description: "Embudo completo para atraer y captar clientes nuevos.", featured: false },
  { id: "producto-plataforma-cursos", categoryId: "cat-cursos-membresias", name: "Plataforma de cursos", price: 5000, description: "Para vender o impartir cursos en línea.", featured: false },
  { id: "producto-membresia-contenido", categoryId: "cat-cursos-membresias", name: "Membresía de contenido recurrente", price: 6000, description: "Cobro recurrente por contenido o comunidad.", featured: false },
];

export type AdnTier = {
  id: string;
  name: string;
  price: number;
  description: string;
};

// Combinables entre sí en modo personalizado — decisión explícita (no es un
// descuido que no sean radio buttons): ver hilo de aprobación del bloque 1.
export const ADN_TIERS: AdnTier[] = [
  { id: "adn-voz-tono", name: "Voz y tono express", price: 2500, description: "Definimos cómo suena tu marca en sus mensajes." },
  { id: "adn-inicial", name: "ADN inicial", price: 6000, description: "Voz y tono + tu identidad visual base (logo, colores, tipografía)." },
  { id: "adn-completo", name: "ADN completo", price: 12000, description: "Estrategia y psicología de marca, identidad completa, voz y contenido con criterio." },
];

// Precio fijo de Prisma — NO editable por vendedora (decisión explícita: es
// un servicio recurrente que presta Prisma, no algo que cada vendedora
// negocie). No lleva fila en seller_prices y en una cotización se guarda
// con un solo precio, nunca con el par cotizado/catálogo.
export type GestionPlan = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export const GESTION_PLANS: GestionPlan[] = [
  { id: "gestion-plan-contenido", name: "Plan Contenido", price: 4500, description: "8 piezas al mes con criterio, publicación y reporte." },
  { id: "gestion-plan-crecimiento", name: "Plan Crecimiento", price: 9000, description: "Contenido + campañas de anuncios para traer clientes nuevos (el presupuesto de pauta lo defines tú)." },
];

export type Package = {
  id: string;
  name: string;
  price: number;
  months: number;
  includedProductIds: string[];
  includedAdnTierId: string;
};

export const PACKAGES: Package[] = [
  {
    id: "paquete-inicia",
    name: "Inicia",
    price: 15000,
    months: 3,
    includedProductIds: ["producto-reservas-basico", "producto-ia-conversacional-basico", "producto-crm-pipeline", "producto-resenas-google"],
    includedAdnTierId: "adn-voz-tono",
  },
  {
    id: "paquete-esencial",
    name: "Esencial",
    price: 27000,
    months: 6,
    includedProductIds: ["producto-reservas-basico", "producto-ia-conversacional-basico", "producto-crm-pipeline", "producto-resenas-google", "producto-landing-page", "producto-formularios-captura", "producto-bandeja-unificada"],
    includedAdnTierId: "adn-inicial",
  },
  {
    id: "paquete-completo",
    name: "Completo",
    price: 45000,
    months: 12,
    includedProductIds: ["producto-reservas-basico", "producto-ia-conversacional-basico", "producto-crm-pipeline", "producto-resenas-google", "producto-landing-page", "producto-formularios-captura", "producto-bandeja-unificada", "producto-sitio-web-basico", "producto-anti-noshows", "producto-reactivacion-inactivos", "producto-social-media-planner", "producto-ia-conversacional-avanzado"],
    includedAdnTierId: "adn-completo",
  },
];

// ---------------------------------------------------------------
// Plataforma — referencia de un tercero (GoHighLevel), NUNCA precio de
// Prisma. El cliente lo paga directo a la plataforma. No lleva fila en
// seller_prices y nunca alimenta opportunities.mrr (eso es ingreso de
// Prisma; plataforma no lo es). En USD, a diferencia de todo lo demás
// arriba, que es MXN.
// ---------------------------------------------------------------

export type PlatformPlan = {
  id: string;
  name: string;
  price: number;
  includesWhatsapp: boolean;
};

export const PLATFORM_PLANS: PlatformPlan[] = [
  { id: "plataforma-growth", name: "Growth", price: 47, includesWhatsapp: false },
  { id: "plataforma-pro", name: "Pro", price: 97, includesWhatsapp: false },
  { id: "plataforma-owner-plus", name: "Owner+", price: 197, includesWhatsapp: true },
];

export type PlatformConsumptionTier = {
  id: string;
  name: string;
  price: number;
};

export const PLATFORM_CONSUMPTION_TIERS: PlatformConsumptionTier[] = [
  { id: "consumo-ligero", name: "Ligero", price: 10 },
  { id: "consumo-medio", name: "Medio", price: 25 },
  { id: "consumo-intensivo", name: "Intensivo", price: 50 },
];

// Flat, no es un catálogo de opciones — un solo concepto que se prende o
// apaga (y que Owner+ ya trae incluido, ver includesWhatsapp arriba).
export const PLATFORM_WHATSAPP_BRIDGE = { id: "plataforma-whatsapp-puente", name: "WhatsApp (el Puente)", price: 29 };
