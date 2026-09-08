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
  /**
   * Versión corta de `propuesta`, para viñetas de un mensaje de WhatsApp
   * (ver config/mensajeContacto.ts). Se redacta aparte, a propósito: no es
   * el párrafo largo truncado — cortarlo a la mitad de una idea se nota.
   */
  propuestaCorta: string
  /** Si viene incluido en cualquier paquete o si se cotiza aparte */
  alcance: 'nucleo' | 'complemento'
}

export const OFERTA_POR_CAPACIDAD: Record<Capacidad, OfertaItem> = {
  has_whatsapp: {
    carencia: 'WhatsApp visible',
    propuesta:
      'Un agente conversacional que atiende WhatsApp, Instagram y Facebook desde un solo lugar. Responde a cualquier hora, resuelve las preguntas de siempre y agenda la cita sin que nadie del equipo tenga que estar pendiente del teléfono.',
    propuestaCorta: 'Un asistente que contesta tu WhatsApp, Instagram y Facebook a cualquier hora.',
    alcance: 'nucleo',
  },

  has_reservas: {
    carencia: 'Reservas en línea',
    propuesta:
      'Un calendario que agenda solo. El cliente elige su horario desde la conversación y queda registrado, sin llamadas de ida y vuelta ni citas anotadas en papel.',
    propuestaCorta: 'Que tus clientes agenden solos, sin llamadas de ida y vuelta.',
    alcance: 'nucleo',
  },

  has_crm: {
    carencia: 'CRM',
    propuesta:
      'Un CRM donde queda el historial de cada cliente: qué se le hizo, cuándo, y cuándo toca volver. Deja de vivir en la memoria de quien atiende.',
    propuestaCorta: 'El historial de cada cliente, siempre a la mano.',
    alcance: 'nucleo',
  },

  has_chat: {
    carencia: 'Chat en vivo',
    propuesta:
      'El mismo agente conversacional cubre las consultas fuera de horario. La mayoría de los mensajes llegan cuando la clínica está cerrada — ahí es donde hoy se pierden.',
    propuestaCorta: 'Los mensajes que llegan con la clínica cerrada, contestados.',
    alcance: 'nucleo',
  },

  has_web: {
    carencia: 'Web propia',
    propuesta:
      'Un sitio conectado directo al WhatsApp, para que quien llega buscando información termine en una conversación y no en un formulario que nadie revisa. Un sitio suelto no vende; conectado, sí.',
    propuestaCorta: 'Un sitio conectado directo a tu WhatsApp.',
    alcance: 'complemento',
  },

  has_redes: {
    carencia: 'Presencia en redes',
    propuesta:
      'Contenido con línea gráfica propia, producido mes con mes: carruseles y piezas que explican lo que haces. Y si quieres alcance más rápido, campañas en Meta con seguimiento de resultados.',
    propuestaCorta: 'Contenido para tus redes, con línea gráfica propia, cada mes.',
    alcance: 'complemento',
  },

  has_blog: {
    carencia: 'Contenido propio',
    propuesta:
      'Piezas de contenido que responden lo que la gente pregunta antes de decidir. Es lo que construye reputación sin depender de que alguien te recomiende.',
    propuestaCorta: 'Contenido que responde lo que la gente pregunta antes de decidir.',
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
      'Gestión de reseñas en Google. Para un negocio local es de donde viene la mayor parte de la confianza previa: quien busca un negocio como el tuyo cerca, primero lee.',
    propuestaCorta: 'Tus reseñas de Google, atendidas.',
    alcance: 'nucleo',
  },
]

/**
 * Override por giro (contacts.industry, texto exacto) de los puntos de
 * oferta que sí cambian según el negocio. El default arriba (has_crm,
 * OFERTA_ADICIONAL) es NEUTRAL a propósito: un giro sin entrada aquí sale
 * genérico, nunca con el texto de otro giro puesto en silencio. Decisión
 * explícita — la alternativa (caer al texto de veterinaria si no hay
 * entrada) fue la que se descartó, porque el día que se cargue un giro 17
 * y alguien olvide esta tabla, el error correcto es "genérico", no "el
 * cliente equivocado".
 *
 * Agrega aquí cada giro real conforme se carga, igual que GIRO_A_FRASE en
 * mensajeContacto.ts — mismo patrón, dos archivos distintos porque son dos
 * textos distintos (oferta vs. frase de justificación del mensaje).
 */
const OFERTA_POR_GIRO: Record<string, { hasCrm: Pick<OfertaItem, 'propuesta' | 'propuestaCorta'>; resenas: Pick<OfertaItem, 'propuesta' | 'propuestaCorta'> }> = {
  Veterinaria: {
    hasCrm: {
      propuesta:
        'Un CRM donde queda el historial de cada cliente y cada mascota: qué se le hizo, cuándo, y cuándo toca volver. Deja de vivir en la memoria de quien atiende.',
      propuestaCorta: 'El historial de cada cliente y su mascota, siempre a la mano.',
    },
    resenas: {
      propuesta:
        'Gestión de reseñas en Google. Para un negocio local es de donde viene la mayor parte de la confianza previa: quien busca una veterinaria cerca, primero lee.',
      propuestaCorta: 'Tus reseñas de Google, atendidas.',
    },
  },
  Dentista: {
    hasCrm: {
      propuesta:
        'Un CRM donde queda el historial de cada paciente: qué se le hizo, cuándo, y cuándo toca su siguiente cita. Deja de vivir en la memoria de quien atiende.',
      propuestaCorta: 'El historial de cada paciente, siempre a la mano.',
    },
    resenas: {
      propuesta:
        'Gestión de reseñas en Google. Para un negocio local es de donde viene la mayor parte de la confianza previa: quien busca un dentista cerca, primero lee.',
      propuestaCorta: 'Tus reseñas de Google, atendidas.',
    },
  },
}

/** True si el giro no tiene entrada en OFERTA_POR_GIRO — para el aviso solo-admin en la ficha. */
export function giroSinOfertaConfigurada(industry: string | null): boolean {
  return industry !== null && !(industry in OFERTA_POR_GIRO)
}

/** Devuelve la oferta que corresponde a las carencias detectadas del prospecto, con el texto de has_crm ajustado al giro. */
export function ofertaParaCarencias(
  capacidades: Partial<Record<Capacidad, boolean | null>>,
  industry: string | null,
): OfertaItem[] {
  const hasCrmOverride = industry ? OFERTA_POR_GIRO[industry]?.hasCrm : undefined

  return (Object.keys(OFERTA_POR_CAPACIDAD) as Capacidad[])
    .filter((c) => capacidades[c] === false) // null = parcial, no cuenta como carencia
    .map((c) => {
      const base = OFERTA_POR_CAPACIDAD[c]
      return c === 'has_crm' && hasCrmOverride ? { ...base, ...hasCrmOverride } : base
    })
}

/** Devuelve OFERTA_ADICIONAL con el texto de reseñas ajustado al giro. Siempre se muestra, sin importar carencias. */
export function ofertaAdicionalParaGiro(industry: string | null): OfertaItem[] {
  const resenasOverride = industry ? OFERTA_POR_GIRO[industry]?.resenas : undefined
  return OFERTA_ADICIONAL.map((item, i) => (i === 0 && resenasOverride ? { ...item, ...resenasOverride } : item))
}