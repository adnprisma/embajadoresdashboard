"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";
import { TASK_STATUSES, type TaskStatus } from "@/config/taskStatus";
import { copy } from "@/config/copy";
import { cn } from "@/lib/utils/cn";

const STATUS_ICON: Record<TaskStatus, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const STATUS_TONE_CLASSES: Record<TaskStatus, string> = {
  pending: "text-text-secondary",
  in_progress: "text-state-progress",
  done: "text-state-positive",
};

const STATUS_ACTIVE_BG: Record<TaskStatus, string> = {
  pending: "bg-bg-sunken",
  in_progress: "bg-state-progress-soft",
  done: "bg-state-positive-soft",
};

// Reemplaza el checkbox de "hecho" — tres opciones, no un ciclo. El ícono
// acompaña al color en cada estado (el color nunca es la única señal,
// CLAUDE.md §4). Se usa igual en el tablero de /tareas y en la pestaña
// Tareas de la ficha de contacto.
export function TaskStatusControl({
  value,
  onChange,
}: {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}) {
  return (
    <div role="radiogroup" aria-label={copy.tareas.board.statusControlLabel} className="flex items-center gap-1">
      {TASK_STATUSES.map((status) => {
        const Icon = STATUS_ICON[status];
        const active = status === value;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(status)}
            // La tarjeta entera es la manija de arrastre de dnd-kit (igual
            // que KanbanCard) — sin esto, el pointerdown del listener de
            // arrastre en el contenedor se adelanta al click de este botón
            // plano y a veces se lo come (el toggle "Hecha" ya usaba este
            // mismo elemento y fallaba de forma intermitente). El menú
            // "···" no lo necesita porque Radix ya protege sus propios
            // triggers.
            onPointerDown={(event) => event.stopPropagation()}
            title={copy.tareas.board.statusLabels[status]}
            className={cn(
              "flex items-center gap-1 rounded-[var(--radius-control)] px-2 py-1 text-xs font-medium transition-colors",
              active
                ? cn(STATUS_ACTIVE_BG[status], STATUS_TONE_CLASSES[status])
                : "text-text-muted hover:bg-bg-sunken",
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>{copy.tareas.board.statusLabels[status]}</span>
          </button>
        );
      })}
    </div>
  );
}
