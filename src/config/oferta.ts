/**
 * Oferta de Prisma por carencia detectada.
 *
 * El análisis de prospección detecta qué le falta a cada negocio. Este archivo
 * traduce cada carencia en lo que Prisma ofrece para resolverla, de modo que la
 * ficha del contacto arme sola los puntos de conversación.
 *
 * Cambiar un texto aquí lo cambia en los 104 prospectos a la vez.
 *
 * REGLAS DE REDACCIÓN
 * - Está escrito para que la vendedora lo diga en voz alta. Tuteo, frases cortas.
 * - Describe qué resuelve, no qué tecnología usa.
 * - Sin superlativos ni promesas de resultado. Prisma es precisa, no ruidosa.
 * - NUNCA pongas precios ni comisiones aquí: este archivo se muestra en pantalla
 *   y los precios cambian. El detalle comercial vive en el manual de paquetes.
 */

export type Capacidad =
  | 'has_web'
  | 'has_whatsapp'
  | 'has_reservas'
  | 'has_crm'
  | 'has_chat'
  | 'has_blog'
  | 'has_redes'

export interface OfertaItem {
  /** Cómo se nombra la carencia en la ficha */
  carencia: string
  /** Qué ofrece Prisma. Es el punto de conversación de la vendedora. */
  propuesta: string
  /** Si viene incluido en cualquier paquete o si se cotiza aparte */
  alcance: 'nucleo' | 'complemento'
}

export const OFERTA_POR_CAPACIDAD: Record<Capacidad, OfertaItem> = {
  has_whatsapp: {
    carencia: 'WhatsApp visible',
    propuesta:
      'Un agente conversacional que atiende WhatsApp, Instagram y Facebook desde un solo lugar. Responde a cualquier hora, resuelve las preguntas de siempre y agenda la cita sin que nadie del equipo tenga que estar pendiente del teléfono.',
    alcance: 'nucleo',
  },

  has_reservas: {
    carencia: 'Reservas en línea',
    propuesta:
      'Un calendario que agenda solo. El cliente elige su horario desde la conversación y queda registrado, sin llamadas de ida y vuelta ni citas anotadas en papel.',
    alcance: 'nucleo',
  },

  has_crm: {
    carencia: 'CRM',
    propuesta:
      'Un CRM donde queda el historial de cada cliente y cada mascota: qué se le hizo, cuándo, y cuándo toca volver. Deja de vivir en la memoria de quien atiende.',
    alcance: 'nucleo',
  },

  has_chat: {
    carencia: 'Chat en vivo',
    propuesta:
      'El mismo agente conversacional cubre las consultas fuera de horario. La mayoría de los mensajes llegan cuando la clínica está cerrada — ahí es donde hoy se pierden.',
    alcance: 'nucleo',
  },

  has_web: {
    carencia: 'Web propia',
    propuesta:
      'Un sitio conectado directo al WhatsApp, para que quien llega buscando información termine en una conversación y no en un formulario que nadie revisa. Un sitio suelto no vende; conectado, sí.',
    alcance: 'complemento',
  },

  has_redes: {
    carencia: 'Presencia en redes',
    propuesta:
      'Contenido con línea gráfica propia, producido mes con mes: carruseles y piezas que explican lo que haces. Y si quieres alcance más rápido, campañas en Meta con seguimiento de resultados.',
    alcance: 'complemento',
  },

  has_blog: {
    carencia: 'Contenido propio',
    propuesta:
      'Piezas de contenido que responden lo que la gente pregunta antes de decidir. Es lo que construye reputación sin depender de que alguien te recomiende.',
    alcance: 'complemento',
  },
}

/**
 * Valor del núcleo que el análisis de prospección NO mide.
 *
 * Las 7 columnas de la tabla comparativa no incluyen reseñas de Google, pero
 * viene en todos los paquetes. Se muestra siempre en la ficha, como argumento
 * adicional, no ligado a una carencia detectada.
 */
export const OFERTA_ADICIONAL: OfertaItem[] = [
  {
    carencia: 'Reseñas en Google',
    propuesta:
      'Gestión de reseñas en Google. Para un negocio local es de donde viene la mayor parte de la confianza previa: quien busca una veterinaria cerca, primero lee.',
    alcance: 'nucleo',
  },
]

/** Devuelve la oferta que corresponde a las carencias detectadas del prospecto. */
export function ofertaParaCarencias(
  capacidades: Partial<Record<Capacidad, boolean | null>>,
): OfertaItem[] {
  return (Object.keys(OFERTA_POR_CAPACIDAD) as Capacidad[])
    .filter((c) => capacidades[c] === false) // null = parcial, no cuenta como carencia
    .map((c) => OFERTA_POR_CAPACIDAD[c])
}