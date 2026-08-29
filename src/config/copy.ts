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
    thisMonthNote: "Este mes",
    historicNote: "Histórico",
    selectAllLabel: "Seleccionar todo lo filtrado",
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
    skipLink: "Saltar al contenido",
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

  dinero: {
    legalNote:
      "Los montos son de referencia. El monto final puede variar según validación y calendario de pago.",
    filterAll: "Todos",
    historyPanel: {
      title: "Historial de comisiones",
      emptyTitle: "Todavía no hay comisiones",
      emptyDescription: "Aparecerán aquí en cuanto se registre tu primera venta.",
      columnConcept: "Concepto",
      columnStatus: "Estado",
      columnPeriod: "Periodo",
      columnAmount: "Monto",
    },
  },

  contactos: {
    // Etiquetas de campo compartidas entre la tabla, el formulario y el
    // mapeo de columnas del importador — una sola fuente para "Negocio",
    // "Teléfono", etc.
    fields: {
      business: "Negocio",
      contact: "Contacto",
      phone: "Teléfono",
      email: "Correo",
      industry: "Giro",
      tags: "Etiquetas",
      notes: "Notas",
      owner: "Vendedora",
    },
    actions: {
      import: "Importar",
      export: "Exportar",
      newContact: "Nuevo contacto",
    },
    filters: {
      searchLabel: "Buscar contactos",
      searchPlaceholder: "Negocio, contacto, teléfono, correo o notas",
      industryLabel: "Giro",
      industryAll: "Todos los giros",
      tagLabel: "Etiqueta",
      tagAll: "Todas las etiquetas",
      ownerLabel: "Vendedora",
      ownerAll: "Todas",
      clearFilters: "Limpiar filtros",
    },
    card: {
      nextTask: (title: string, date?: string) =>
        date ? `Próxima tarea: ${title} · ${date}` : `Próxima tarea: ${title}`,
    },
    // Vista alterna de la misma pantalla (ver ContactosView) — no una
    // pestaña ni una pantalla nueva. Solo muestra contactos con análisis de
    // prospección; `omittedNote` es la línea que explica por qué el resto no
    // aparece, para que nadie lea la ausencia como contactos perdidos.
    comparativa: {
      viewLista: "Lista",
      viewComparativa: "Comparativa",
      omittedNote: (n: number) =>
        n === 0
          ? ""
          : n === 1
            ? "1 contacto sin análisis no se muestra aquí."
            : `${n} contactos sin análisis no se muestran aquí.`,
      columnScore: "Score",
      columnColonia: "Colonia",
      columnGaps: "Carencias",
      columnPriority: "Prioridad",
      scoreNone: "Sin score",
      gapsNone: "—",
      // Alta/Media/Baja no llevan color — la tabla ya está ordenada por
      // score, la posición vertical ya comunica la prioridad. Solo Urgente
      // lleva acento (--state-pending, "requiere acción"), nunca coral: en
      // este sistema el rojo es desenlace negativo, y un urgente es la
      // mejor oportunidad de la lista, no lo contrario.
      priorityHigh: "Alta",
      priorityMedium: "Media",
      priorityLow: "Baja",
      // Encabezados cortos para las 7 columnas de capacidad — la etiqueta
      // completa ("WhatsApp visible") vive en el aria-label/title de cada
      // celda (ver CapabilityIcon), no hace falta repetirla en el encabezado.
      capacityHeaders: {
        has_web: "Web",
        has_whatsapp: "WhatsApp",
        has_reservas: "Reservas",
        has_crm: "CRM",
        has_chat: "Chat",
        has_blog: "Blog",
        has_redes: "Redes",
      },
      noAnalysisTitle: "Ningún contacto con análisis",
      noAnalysisDescription: "Los contactos que coinciden con estos filtros no tienen análisis de prospección todavía.",
    },
    // Barra de selección múltiple — solo admin (ver ContactosView).
    selection: {
      count: (n: number) => (n === 1 ? "1 seleccionado" : `${n} seleccionados`),
      reassign: "Reasignar",
      rowLabel: (businessName: string) => `Seleccionar ${businessName}`,
    },
    reassignDialog: {
      title: "Reasignar contactos",
      description: (n: number) => (n === 1 ? "Vas a mover 1 contacto:" : `Vas a mover ${n} contactos:`),
      currentOwner: (name: string) => `de ${name}`,
      currentOwnerNone: "sin vendedora asignada",
      toLabel: "Nueva vendedora",
      toPlaceholder: "Elige una vendedora",
      reasonLabel: "Motivo",
      reasonPlaceholder: "Por qué se reasignan estos contactos",
      reasonRequired: "El motivo es obligatorio.",
      historyWarning:
        "También se mueve todo su historial: tareas, interacciones, oportunidades, citas y análisis de prospección.",
      cancel: "Cancelar",
      confirm: "Reasignar",
      confirming: "Reasignando…",
      successToast: (n: number) => (n === 1 ? "1 contacto reasignado." : `${n} contactos reasignados.`),
      errorToast: "No pudimos reasignar los contactos. Intenta de nuevo.",
    },
    emptyTitle: "Todavía no tienes contactos",
    emptyDescription: "Se irán agregando conforme captures tu cartera.",
    noMatchesTitle: "Sin resultados",
    noMatchesDescription: "Ningún contacto coincide con estos filtros.",

    form: {
      createTitle: "Nuevo contacto",
      editTitle: "Editar contacto",
      businessPlaceholder: "Nombre del negocio",
      contactPlaceholder: "Nombre de la persona de contacto",
      phonePlaceholder: "10 dígitos",
      emailPlaceholder: "correo@negocio.com",
      industryPlaceholder: "Ej. Restaurantes",
      tagsPlaceholder: "VIP, Frecuente",
      tagsHint: "Sepáralas con comas.",
      notesPlaceholder: "Notas internas sobre este contacto",
      cancel: "Cancelar",
      submitCreate: "Crear contacto",
      submitEdit: "Guardar cambios",
      submitLoading: "Guardando…",
      successCreateToast: "Contacto creado.",
      successEditToast: "Cambios guardados.",
      errorToast: "No pudimos guardar el contacto. Intenta de nuevo.",
      errors: {
        businessRequired: "Ingresa el nombre del negocio.",
        emailInvalid: "Ingresa un correo válido.",
      },
    },

    detail: {
      ownerLabel: (name: string) => `Vendedora: ${name}`,
      tabs: {
        data: "Datos",
        timeline: "Línea de tiempo",
        tasks: "Tareas",
        opportunities: "Oportunidades",
        analysis: "Análisis",
        assignments: "Historial de asignación",
      },
      dataPanel: {
        createdAt: "Contacto desde",
        noValue: "Sin capturar",
      },
      actions: {
        edit: "Editar",
        newOpportunity: "Crear oportunidad",
        newTask: "Crear tarea",
        moreActions: "Más acciones",
        delete: "Eliminar contacto",
      },
      deleteDialog: {
        title: (businessName: string) => `¿Eliminar a ${businessName}?`,
        intro: (businessName: string) =>
          `Esto elimina a ${businessName} de tus contactos de forma permanente. No se puede deshacer.`,
        loadingImpact: "Calculando qué más se ve afectado…",
        cascadeWarning: (parts: string) =>
          `Esto también borra de forma permanente: ${parts} — pertenecen únicamente a este contacto.`,
        cascadeNone: "Este contacto no tiene tareas ni interacciones registradas, así que no se pierde nada más.",
        keepNotice: (parts: string) => `${parts} seguirán existiendo, pero sin este contacto vinculado.`,
        taskUnit: (n: number) => (n === 1 ? "1 tarea" : `${n} tareas`),
        interactionUnit: (n: number) => (n === 1 ? "1 interacción" : `${n} interacciones`),
        opportunityUnit: (n: number) => (n === 1 ? "1 oportunidad" : `${n} oportunidades`),
        appointmentUnit: (n: number) => (n === 1 ? "1 cita" : `${n} citas`),
        cancel: "Cancelar",
        confirm: "Eliminar contacto",
        confirming: "Eliminando…",
        successToast: "Contacto eliminado.",
        errorToast: "No pudimos eliminar el contacto. Intenta de nuevo.",
      },
      timeline: {
        emptyTitle: "Todavía no hay interacciones",
        emptyDescription: "Las llamadas, mensajes y notas de este contacto aparecerán aquí.",
      },
      tasksTab: {
        emptyTitle: "Todavía no hay tareas",
        emptyDescription: "Créalas con el botón \"Crear tarea\" de arriba.",
      },
      opportunitiesTab: {
        emptyTitle: "Todavía no hay oportunidades",
        emptyDescription: "Créalas con el botón \"Crear oportunidad\" de arriba.",
        stageLabel: (stage: string) => `Etapa: ${stage}`,
      },
      analysisTab: {
        emptyTitle: "Este contacto no tiene análisis de prospección",
        emptyDescription: "Solo los contactos que vinieron de una prospección cargada tienen este análisis.",
        scoreLabel: (score: number) => `Score ${score}/10`,
        urgentBadge: "Urgente",
        capabilitiesTitle: "Capacidades detectadas",
        capabilityState: {
          present: "Presente",
          absent: "Ausente",
          partial: "Parcial",
        },
        contactPanel: {
          address: "Dirección",
          phone: "Teléfono",
          email: "Correo",
          web: "Web",
        },
        gapsTitle: (n: number) => (n === 1 ? "Qué le falta (1 carencia)" : `Qué le falta (${n} carencias)`),
        gapsEmpty: "Sin carencias registradas.",
        opportunitiesTitle: "Qué le ofrece Prisma",
        scopeNucleo: "Incluido en el paquete",
        scopeComplemento: "Se cotiza aparte",
        mensaje: {
          title: "Mensaje sugerido",
          // Quien se presenta es la vendedora dueña del contacto, no la
          // marca — si abre un admin la ficha de un lead de otra persona,
          // el mensaje tiene que seguir sonando a esa persona. Sin nombre
          // capturado, se omite la presentación entera: "Hola, vi tu
          // negocio..." ya se sostiene solo, sin un genérico ni un hueco.
          // Recibe solo el primer nombre (nunca el apellido) — la vendedora
          // habla en primera persona del singular, no "podemos".
          greeting: (ownerFirstName: string | null, businessName: string, colonia: string | null) => {
            const location = colonia ? ` en ${colonia}` : "";
            const intro = ownerFirstName ? `Hola, soy ${ownerFirstName}. Vi` : "Hola, vi";
            return `${intro} tu negocio ${businessName}${location}.`;
          },
          // Frase de contexto antes de las viñetas — sin ella aparecen de la
          // nada. `frase` ya trae armado el giro en plural + ubicación (ver
          // mensajeContacto.ts), nunca se pluraliza aquí a mano.
          justification: (frase: string) => `Trabajo con ${frase}. Esto es lo que puedo dejarte funcionando:`,
          closing: "¿Tienes 15 minutos esta semana para platicarlo? Sin costo ni compromiso.",
          copyButton: "Copiar mensaje",
          copiedToast: "Mensaje copiado.",
          whatsappButton: "Abrir WhatsApp",
          whatsappDisabledHint: "No pudimos confirmar el formato de este teléfono.",
        },
      },
      assignmentsTab: {
        emptyTitle: "Este contacto nunca se ha reasignado",
        emptyDescription: "Los cambios de vendedora aparecerán aquí, con fecha, motivo y quién los autorizó.",
        from: (name: string) => `De ${name}`,
        fromNone: "Sin vendedora anterior",
        to: (name: string) => `a ${name}`,
        authorizedBy: (name: string) => `Autorizó: ${name}`,
        noReason: "Sin motivo registrado",
      },
    },

    import: {
      dialogTrigger: "Importar",
      dialogTitle: "Importar contactos",
      steps: {
        file: "Archivo",
        mapping: "Mapeo",
        review: "Resumen",
      },
      back: "Atrás",
      next: "Siguiente",
      cancel: "Cancelar",
      step1: {
        dropzoneTitle: "Suelta tu archivo CSV aquí",
        dropzoneDescription: "O elige un archivo desde tu computadora.",
        chooseFile: "Elegir archivo",
        selectedFile: (name: string, rows: number) => `${name} · ${rows} filas`,
        parseError: "No pudimos leer ese archivo. Verifica que sea un CSV válido.",
      },
      step2: {
        title: "Relaciona cada columna de tu archivo con un campo",
        description: "Detectamos algunas automáticamente — revísalas antes de continuar.",
        notMapped: "No importar",
        previewTitle: "Vista previa (primeras 5 filas)",
      },
      assignTo: {
        label: "Asignar a",
        hint: "Los contactos importados quedarán a nombre de esta persona.",
      },
      assignmentReason: "Importación de contactos",
      step3: {
        readyTitle: "Todo listo para importar",
        readyDescription: (count: number) => `Se validarán ${count} filas antes de guardarlas.`,
        startImport: "Importar",
        importing: "Importando…",
        summary: (imported: number, failed: number) =>
          failed === 0
            ? `${imported} importados.`
            : `${imported} importados · ${failed} con error.`,
        downloadErrors: "Descargar errores (CSV)",
        done: "Listo",
        rowError: (row: number, message: string) => `Fila ${row}: ${message}`,
      },
    },
  },

  pipeline: {
    newOpportunity: "Nueva oportunidad",
    moveSuccessToast: "Oportunidad movida.",
    moveErrorToast: "No pudimos mover la oportunidad. Intenta de nuevo.",
    metrics: {
      newMonth: "Nuevas este mes",
      analyses: "En análisis",
      showRate: "Tasa de asistencia",
      closeRate: "Tasa de cierre",
      volumeMonth: "Volumen cerrado",
      closesMonth: "Cierres este mes",
    },
    board: {
      emptyColumn: "Sin oportunidades",
    },
    card: {
      valueLabel: "Valor",
      mrrLabel: "MRR",
      moveToLabel: "Mover a…",
      moveToCurrentHint: "Etapa actual",
      deleteLabel: "Eliminar oportunidad",
    },
    deleteDialog: {
      title: (businessName: string) => `¿Eliminar "${businessName}"?`,
      description: (value: string, mrr: string) =>
        `Se perderá el registro de ${value} en valor y ${mrr} de MRR — esto también cambia las métricas del tablero. No se puede deshacer.`,
      cancel: "Cancelar",
      confirm: "Eliminar oportunidad",
      confirming: "Eliminando…",
      successToast: "Oportunidad eliminada.",
      errorToast: "No pudimos eliminar la oportunidad. Intenta de nuevo.",
    },
    dialog: {
      title: "Nueva oportunidad",
      businessLabel: "Negocio",
      businessPlaceholder: "Nombre del negocio",
      contactLabel: "Contacto",
      contactPlaceholder: "Buscar contacto…",
      contactNoResults: "Sin coincidencias",
      contactClear: "Quitar contacto",
      valueLabel: "Valor",
      mrrLabel: "MRR",
      stageLabel: "Etapa",
      notesLabel: "Notas",
      notesPlaceholder: "Notas internas sobre esta oportunidad",
      cancel: "Cancelar",
      submit: "Crear oportunidad",
      submitLoading: "Creando…",
      errors: {
        businessRequired: "El negocio es obligatorio.",
      },
      errorToast: "No pudimos crear la oportunidad. Intenta de nuevo.",
      successToast: "Oportunidad creada.",
    },
  },

  tareas: {
    pendingTitle: "Pendientes",
    completedTitle: "Completadas",
    showCompleted: "Mostrar completadas",
    hideCompleted: "Ocultar completadas",
    overdueLabel: "Vencida",
    noDueDate: "Sin fecha",
    emptyTitle: "Todavía no hay tareas",
    emptyDescription: "Las tareas se crean desde la ficha de un contacto.",
    emptyCta: "Ir a contactos",
    allDoneMessage: "Todo al día — no hay tareas pendientes.",
    toggleSuccessToast: "Tarea actualizada.",
    toggleErrorToast: "No pudimos actualizar la tarea. Intenta de nuevo.",
    moreActionsLabel: "Más acciones",
    deleteLabel: "Eliminar",
    deleteToast: "Tarea eliminada.",
    undoLabel: "Deshacer",
    deleteErrorToast: "No pudimos eliminar la tarea. Intenta de nuevo.",
    dialog: {
      createTitle: "Nueva tarea",
      titleLabel: "Título",
      titlePlaceholder: "¿Qué hay que hacer?",
      dueLabel: "Vencimiento",
      cancel: "Cancelar",
      submit: "Crear tarea",
      submitLoading: "Creando…",
      errors: {
        titleRequired: "El título es obligatorio.",
      },
      successToast: "Tarea creada.",
      errorToast: "No pudimos crear la tarea. Intenta de nuevo.",
    },
  },

  calendario: {
    newAppointment: "Nueva cita",
    today: "Hoy",
    previousLabel: "Periodo anterior",
    nextLabel: "Periodo siguiente",
    legend: {
      team: "Equipo (solo lectura)",
      upcoming: "Próxima",
      past: "Pasada",
      cancelled: "Cancelada",
    },
    views: {
      month: "Mes",
      week: "Semana",
      agenda: "Agenda",
    },
    moreEvents: (n: number) => `+${n} más`,
    emptyAgendaTitle: "No hay citas este mes",
    emptyAgendaDescription: "Da clic en un día del calendario para agendar una.",
    dialog: {
      createTitle: "Nueva cita",
      editTitle: "Editar cita",
      titleLabel: "Título",
      titlePlaceholder: "Nombre de la cita",
      dateLabel: "Fecha",
      startTimeLabel: "Hora de inicio",
      durationLabel: "Duración",
      durationMinutesLabel: (minutes: number) => (minutes < 60 ? `${minutes} min` : `${minutes / 60} h`),
      contactLabel: "Contacto",
      statusLabel: "Estado",
      statusOptions: {
        scheduled: "Programada",
        done: "Realizada",
        cancelled: "Cancelada",
      },
      cancel: "Cancelar",
      submitCreate: "Crear cita",
      submitEdit: "Guardar cambios",
      submitLoading: "Guardando…",
      errors: {
        titleRequired: "El título es obligatorio.",
        endAfterStart: "La cita debe durar más de cero minutos.",
      },
      successCreateToast: "Cita creada.",
      successEditToast: "Cita actualizada.",
      errorToast: "No pudimos guardar la cita. Intenta de nuevo.",
      moreActionsLabel: "Más acciones",
      deleteLabel: "Eliminar cita",
      deleteDialogTitle: (title: string) => `¿Eliminar "${title}"?`,
      deleteDialogDescription: "Esto elimina la cita de forma permanente. No se puede deshacer.",
      deleteConfirm: "Eliminar cita",
      deleteConfirming: "Eliminando…",
      deleteSuccessToast: "Cita eliminada.",
      deleteErrorToast: "No pudimos eliminar la cita. Intenta de nuevo.",
    },
  },

  clientes: {
    stats: {
      active: "Clientes activos",
      mrr: "MRR activo",
      atRisk: "En riesgo",
      cancelled: "Cancelados",
    },
    table: {
      columnName: "Cliente",
      columnPlan: "Plan",
      columnMrr: "MRR",
      columnStatus: "Estado",
      columnRenewal: "Próxima renovación",
      columnActions: "Acciones",
      noValue: "—",
    },
    status: {
      active: "Activo",
      at_risk: "En riesgo",
      cancelled: "Cancelado",
    },
    emptyTitle: "Todavía no hay clientes",
    emptyDescription: "Los clientes que cierres desde el pipeline aparecerán aquí.",
    moreActionsLabel: "Más acciones",
    deleteLabel: "Eliminar cliente",
    deleteDialog: {
      title: (name: string) => `¿Eliminar a ${name}?`,
      intro: (name: string) =>
        `Esto elimina a ${name} de tu cartera de clientes de forma permanente. No se puede deshacer.`,
      loadingImpact: "Calculando qué más se ve afectado…",
      keepNotice: (parts: string) => `${parts} seguirán existiendo, pero sin este cliente vinculado.`,
      keepNone: "Este cliente no tiene comisiones registradas, así que no se pierde nada más.",
      commissionUnit: (n: number) => (n === 1 ? "1 comisión" : `${n} comisiones`),
      cancel: "Cancelar",
      confirm: "Eliminar cliente",
      confirming: "Eliminando…",
      successToast: "Cliente eliminado.",
      errorToast: "No pudimos eliminar el cliente. Intenta de nuevo.",
    },
  },

  perfil: {
    tabs: {
      personal: "Datos personales",
      billing: "Datos de cobro",
      prices: "Mis precios",
      documents: "Documentos",
    },
    personal: {
      avatarLabel: "Foto de perfil",
      avatarChange: "Cambiar foto",
      avatarRemove: "Quitar foto",
      avatarHint: "JPG, PNG o WEBP. Máximo 2 MB — se recorta al centro en cuadrado.",
      avatarErrorType: "Ese archivo no es una imagen válida (usa JPG, PNG o WEBP).",
      avatarErrorSize: "La imagen pesa más de 2 MB.",
      avatarUploadError: "No pudimos subir la foto. Intenta de nuevo.",
      avatarUploadSuccess: "Foto actualizada.",
      avatarRemoveError: "No pudimos quitar la foto. Intenta de nuevo.",
      fullNameLabel: "Nombre completo",
      fullNamePlaceholder: "Tu nombre",
      fullNameRequired: "El nombre es obligatorio.",
      submit: "Guardar datos personales",
      submitLoading: "Guardando…",
      successToast: "Datos personales actualizados.",
      errorToast: "No pudimos guardar tus datos. Intenta de nuevo.",
    },
    billing: {
      intro: "Estos datos se usan para pagarte y facturar tus comisiones.",
      bankSectionTitle: "Datos bancarios",
      bankNameLabel: "Banco",
      bankNamePlaceholder: "Nombre del banco",
      accountHolderLabel: "Titular de la cuenta",
      accountHolderPlaceholder: "Nombre completo del titular",
      clabeLabel: "CLABE interbancaria",
      clabePlaceholder: "18 dígitos",
      clabeError: "La CLABE debe tener 18 dígitos.",
      taxSectionTitle: "Datos fiscales",
      rfcLabel: "RFC",
      rfcPlaceholder: "RFC a 12 o 13 caracteres",
      rfcError: "El RFC no es válido.",
      razonSocialLabel: "Razón social",
      razonSocialPlaceholder: "Nombre o razón social",
      regimenFiscalLabel: "Régimen fiscal",
      regimenFiscalPlaceholder: "Opcional",
      direccionFiscalLabel: "Dirección fiscal",
      direccionFiscalPlaceholder: "Opcional",
      requiredHint: "Completa banco, titular, CLABE, RFC y razón social para habilitar el cobro.",
      submit: "Guardar datos de cobro",
      submitLoading: "Guardando…",
      successToast: "Datos de cobro actualizados.",
      errorToast: "No pudimos guardar tus datos de cobro. Intenta de nuevo.",
    },
    prices: {
      intro: "Precios de referencia para tu propio uso — todavía ningún cotizador de Prisma los consume.",
      addRow: "Agregar precio",
      labelLabel: "Concepto",
      labelPlaceholder: "Ej. Plan Básico, Setup inicial",
      monthlyLabel: "Mensual",
      annualLabel: "Anual",
      removeRow: "Quitar",
      emptyTitle: "Todavía no tienes precios propios",
      emptyDescription: "Agrega conceptos y sus precios de referencia.",
      submit: "Guardar precios",
      submitLoading: "Guardando…",
      successToast: "Precios actualizados.",
      errorToast: "No pudimos guardar tus precios. Intenta de nuevo.",
      errors: {
        labelRequired: "El concepto es obligatorio.",
        negativeNumber: "No puede ser negativo.",
      },
    },
    documents: {
      intro: "Sube comprobantes u otros documentos de respaldo. Solo tú puedes verlos.",
      uploadLabel: "Subir documento",
      uploadHint: "Máximo 10 MB por archivo.",
      uploadErrorSize: "Ese archivo pesa más de 10 MB.",
      uploadError: "No pudimos subir el documento. Intenta de nuevo.",
      uploadSuccess: "Documento subido.",
      deleteLabel: "Eliminar",
      deleteConfirmTitle: (name: string) => `¿Eliminar "${name}"?`,
      deleteConfirmDescription: "Esto elimina el archivo de forma permanente. No se puede deshacer.",
      deleteCancel: "Cancelar",
      deleteConfirm: "Eliminar documento",
      deleteConfirming: "Eliminando…",
      deleteSuccessToast: "Documento eliminado.",
      deleteErrorToast: "No pudimos eliminar el documento. Intenta de nuevo.",
      emptyTitle: "Todavía no hay documentos",
      emptyDescription: "Los archivos que subas aparecerán aquí.",
      moreActionsLabel: "Más acciones",
    },
  },

  recursos: {
    emptyTitle: "Todavía no hay recursos",
    emptyDescription: "Se irán agregando conforme estén listos.",
    viewer: {
      back: "Volver a Recursos",
      fullscreen: "Pantalla completa",
      iframeTitle: (titulo: string) => `Contenido de ${titulo}`,
    },
  },
} as const;
