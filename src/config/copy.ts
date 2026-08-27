// Todo texto visible al usuario vive aquí. Cero strings en JSX (CLAUDE.md §3).
// Este archivo arranca con los textos del shell y del dashboard (bloque 1).
// El resto de las pantallas se agrega conforme avanza el roadmap.
import { BRAND } from "./brand";

export const copy = {
  common: {
    loading: "Cargando…",
    retry: "Reintentar",
    genericErrorTitle: "Algo salió mal",
    genericErrorDescription: "No pudimos cargar esta información.",
    updatedSecondsAgo: (seconds: number) => `Actualizado hace ${seconds} s`,
    estimatedNote: "Estimado",
  },

  notFound: {
    title: "No encontramos esta página",
    description: "Revisa la dirección o vuelve al dashboard.",
    cta: "Ir al dashboard",
  },

  appError: {
    title: "Algo salió mal",
    description: "Ocurrió un error inesperado. Puedes intentar de nuevo.",
    cta: "Reintentar",
  },

  shell: {
    loadingScreen: {
      title: "Preparando tu panel",
      description: "Esto toma solo un momento.",
    },
    nav: {
      dashboard: "Dashboard",
      money: "Mi dinero",
      clients: "Mis clientes",
      pipeline: "Pipeline",
      contacts: "Contactos",
      calendar: "Calendario",
      tasks: "Mis tareas",
      resources: "Recursos",
      myLink: "Mi link",
      ranking: "Ranking",
    },
    userMenu: {
      profile: "Perfil",
      logout: "Cerrar sesión",
    },
    footer: {
      copyright: `© ${BRAND.name}`,
    },
  },

  dashboard: {
    greeting: (name: string) => `Hola, ${name}`,
    chips: {
      plan: "Plan",
      status: "Estado",
      code: "Código",
    },
    billingIncompleteAlert: {
      title: "Completa tus datos de facturación",
      description: "Necesitamos esta información para poder pagarte.",
      cta: "Completar en mi perfil",
    },
    stats: {
      earnedThisMonth: "Ganado del mes",
      activeClients: "Clientes activos",
      mrr: "MRR",
      ranking: "Ranking",
      rankingHint: (total: number) => `de ${total}`,
    },
    commissionStatuses: {
      validating: "En validación",
      trial: "En prueba",
      payable: "Por pagar",
      paid: "Pagado",
    },
    salesPanel: {
      title: "Mis ventas",
    },
    commissionsChart: {
      title: "Comisiones",
    },
    recentCommissions: {
      title: "Últimas comisiones",
      emptyTitle: "Todavía no hay comisiones",
      emptyDescription: "Aparecerán aquí en cuanto se registre tu primera venta.",
    },
    upcomingRenewals: {
      title: "Renovaciones próximas",
      emptyTitle: "No hay renovaciones próximas",
      emptyDescription: "Cuando un cliente esté por renovar, lo verás aquí.",
    },
  },
} as const;
