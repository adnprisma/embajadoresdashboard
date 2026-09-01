// Estado de gestión de una tarea — organización del día, no verdad de
// negocio. No confundir con el estado del CONTACTO
// (src/config/contactStatus.ts), que es la única fuente para cualquier
// métrica (bloque 3, weekly_status_funnel()). Ningún número de embudo sale
// nunca de tasks.
export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
