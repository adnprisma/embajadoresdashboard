"use client";

import { useDraggable } from "@dnd-kit/core";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { TaskDialog } from "@/components/tareas/TaskDialog";
import { TaskStatusControl } from "@/components/tareas/TaskStatusControl";
import { copy } from "@/config/copy";
import type { TaskStatus } from "@/config/taskStatus";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";

export type MoveTarget = { id: string; date: Date; label: string };

function formatTime(iso: string) {
  return format(parseISO(iso), "h:mm a", { locale: es });
}

// Toda la tarjeta es la manija de arrastre (igual que KanbanCard) — el
// menú "···" y los controles internos usan stopPropagation vía los propios
// primitivos de Radix, que no interfieren con los listeners de pointer de
// dnd-kit puestos en el contenedor.
export function TaskCard({
  task,
  moveTargets,
  onStatusChange,
  onMoveToDay,
  onDelete,
  dragOverlay = false,
  interactive = true,
}: {
  task: TaskRow;
  moveTargets: MoveTarget[];
  onStatusChange: (status: TaskStatus) => void;
  onMoveToDay: (date: Date) => void;
  onDelete: () => void;
  // `dragOverlay`: la vista flotante que sigue al cursor mientras se
  // arrastra (estilo rotado). `interactive`: si esta instancia concreta
  // puede iniciar un arrastre real — false en la lista de un día en móvil,
  // donde solo hay una columna visible y no hay a dónde soltar.
  dragOverlay?: boolean;
  interactive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const draggableProps = dragOverlay || !interactive ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      {...draggableProps}
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3 shadow-[var(--shadow-card)]",
        isDragging && !dragOverlay ? "opacity-40" : "",
        dragOverlay ? "rotate-2 opacity-90 shadow-[var(--shadow-raised)]" : "",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{task.title}</p>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={copy.tareas.moreActionsLabel}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 w-56 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
            >
              <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                {copy.tareas.board.moveToLabel}
              </DropdownMenu.Label>
              {moveTargets.map((target) => (
                <DropdownMenu.Item
                  key={target.id}
                  onSelect={() => onMoveToDay(target.date)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken"
                >
                  {target.label}
                  {task.due_at && format(parseISO(task.due_at), "yyyy-MM-dd") === target.id ? (
                    <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  ) : null}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
              <TaskDialog
                task={task}
                trigger={
                  <DropdownMenu.Item
                    onSelect={(event) => event.preventDefault()}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken"
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                    {copy.tareas.board.editTask}
                  </DropdownMenu.Item>
                }
              />
              <DropdownMenu.Item
                onSelect={onDelete}
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                {copy.tareas.deleteLabel}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {task.contact_id && task.contact_business_name ? (
        <Link
          href={`/contactos/${task.contact_id}`}
          className="truncate text-xs text-text-muted underline-offset-2 hover:underline"
        >
          {task.contact_business_name}
        </Link>
      ) : null}

      {task.due_at ? <p className="numeric text-xs text-text-muted">{formatTime(task.due_at)}</p> : null}

      <TaskStatusControl value={task.status} onChange={onStatusChange} />
    </div>
  );
}
