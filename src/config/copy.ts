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
    placeholderPageDescription: "Esta pantalla se construye en un bloque posterior del roadmap.",
    copyFieldCopyLabel: "Copiar",
    copyFieldShareLabel: "Compartir",
    copyFieldCopied: "Copiado",
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

  auth: {
    login: {
      title: "Inicia sesión",
      description: "Entra con tu correo y tu contraseña.",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tu@correo.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "••••••••",
      forgotPasswordLink: "¿Olvidaste tu contraseña?",
      submit: "Iniciar sesión",
      submitLoading: "Iniciando sesión…",
      credentialsErrorBanner: "Correo o contraseña incorrectos.",
      genericErrorBanner: "No pudimos iniciar sesión. Intenta de nuevo.",
      errors: {
        emailRequired: "Ingresa tu correo electrónico.",
        emailInvalid: "Ingresa un correo válido.",
        passwordRequired: "Ingresa tu contraseña.",
        passwordMin: "La contraseña debe tener al menos 8 caracteres.",
      },
    },
    recuperar: {
      title: "Recupera tu contraseña",
      description: "Te enviamos un enlace para restablecerla.",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "tu@correo.com",
      submit: "Enviar enlace",
      submitLoading: "Enviando…",
      successTitle: "Revisa tu correo",
      successDescription:
        "Si ese correo está registrado, te llegará un enlace para restablecer tu contraseña.",
      backToLogin: "Volver a iniciar sesión",
      genericErrorBanner: "No pudimos procesar tu solicitud. Intenta de nuevo.",
      errors: {
        emailRequired: "Ingresa tu correo electrónico.",
        emailInvalid: "Ingresa un correo válido.",
      },
    },
    restablecer: {
      title: "Crea una nueva contraseña",
      description: "Debe tener al menos 8 caracteres.",
      passwordLabel: "Nueva contraseña",
      confirmPasswordLabel: "Confirma tu nueva contraseña",
      submit: "Guardar contraseña",
      submitLoading: "Guardando…",
      successMessage: "Tu contraseña se actualizó correctamente.",
      goToDashboard: "Ir al dashboard",
      invalidLinkTitle: "Este enlace ya no es válido",
      invalidLinkDescription: "Pide un nuevo enlace para restablecer tu contraseña.",
      requestNewLink: "Pedir un nuevo enlace",
      genericErrorBanner: "No pudimos actualizar tu contraseña. Intenta de nuevo.",
      strength: {
        label: "Seguridad de la contraseña",
        weak: "Débil",
        fair: "Regular",
        good: "Buena",
        strong: "Fuerte",
      },
      errors: {
        passwordMin: "La contraseña debe tener al menos 8 caracteres.",
        confirmRequired: "Confirma tu nueva contraseña.",
        passwordsDontMatch: "Las contraseñas no coinciden.",
      },
    },
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
      signingOut: "Cerrando sesión…",
      signOutError: "No pudimos cerrar tu sesión. Intenta de nuevo.",
    },
    mobileMenu: {
      openLabel: "Abrir menú",
      closeLabel: "Cerrar menú",
      title: "Menú de navegación",
    },
    notifications: {
      buttonLabel: "Notificaciones",
      title: "Notificaciones",
      empty: "Sin notificaciones por ahora.",
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
      newMonth: "Nuevas este mes",
      closesMonth: "Cerradas este mes",
      closeRate: "Tasa de cierre",
    },
    commissionsChart: {
      title: "Comisiones",
      tableCaption: "Comisiones de los últimos 6 meses",
      columnMonth: "Mes",
      columnAmount: "Monto",
    },
    recentCommissions: {
      title: "Últimas comisiones",
      emptyTitle: "Todavía no hay comisiones",
      emptyDescription: "Aparecerán aquí en cuanto se registre tu primera venta.",
      withoutClient: "Sin cliente asociado",
    },
    upcomingRenewals: {
      title: "Renovaciones próximas",
      emptyTitle: "No hay renovaciones próximas",
      emptyDescription: "Cuando un cliente esté por renovar, lo verás aquí.",
      renewsOn: (date: string) => `Renueva el ${date}`,
    },
  },

  // Página temporal del bloque 5 (/demo) — se borra en el bloque 15.
  demo: {
    pageTitle: "Demo de componentes",
    pageDescription: "Página temporal del bloque 5. Se borra en el bloque 15 del roadmap.",
    sections: {
      statCard: "StatCard",
      panel: "Panel",
      emptyState: "EmptyState",
      segmentedControl: "SegmentedControl",
      dataTable: "DataTable",
      copyField: "CopyField",
      stepper: "Stepper",
      alertBanner: "AlertBanner",
      moneyValue: "MoneyValue",
      badge: "Badge",
      skeleton: "Skeleton",
    },
    statCard: {
      earned: "Ganado del mes",
      clients: "Clientes activos",
      ranking: "Ranking",
      rankingHint: "de 128",
      loadingLabel: "Cargando",
    },
    panel: {
      title: "Panel de ejemplo",
      subtitle: "Subtítulo opcional",
      body: "Contenido de ejemplo dentro del panel.",
      action: "Ver todo",
    },
    emptyState: {
      title: "Todavía no hay datos",
      description: "Aparecerán aquí en cuanto tengas actividad.",
      cta: "Crear el primero",
    },
    segmentedControl: {
      week: "Semana",
      month: "Mes",
      year: "Año",
    },
    dataTable: {
      columnName: "Nombre",
      columnStatus: "Estado",
      columnAmount: "Monto",
      emptyTitle: "Sin registros",
      emptyDescription: "Todavía no hay filas para mostrar.",
    },
    copyField: {
      label: "Tu link de referido",
      secondaryAction: "Restablecer",
    },
    stepper: {
      step1: "Datos generales",
      step2: "Complementos",
      step3: "Resumen",
      next: "Avanzar",
    },
    alertBanner: {
      warningTitle: "Revisa tus datos de facturación",
      warningDescription: "Faltan datos para poder pagarte.",
      infoTitle: "Nueva función disponible",
      infoDescription: "Ya puedes exportar tus contactos a CSV.",
    },
    badge: {
      neutral: "Neutral",
      info: "Info",
      success: "Éxito",
      warning: "Pendiente",
      danger: "Error",
    },
    errorState: {
      title: "No pudimos cargar esta sección",
      description: "Intenta de nuevo en unos segundos.",
    },
  },
} as const;
