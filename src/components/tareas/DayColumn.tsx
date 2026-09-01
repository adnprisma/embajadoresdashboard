"use client";

import { useDroppable } from "@dnd-kit/core";
import { copy } from "@/config/copy";
import type { TaskStatus } from "@/config/taskStatus";
import type { TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";
import { TaskCard, type MoveTarget } from "./TaskCard";

export type BoardColumn = {
  // Fecha (yyyy-MM-dd) para columnas de día — único id válido como
  // droppable. "overdue" | "weekend" | "no_date" no son destino de
  // arrastre (ver TasksBoard.tsx: mover a un rango ambiguo o borrar la
  // fecha no tiene un único resultado obvio, así que esos tres solo son
  // origen — se mueven por "Mover a…" o por "Editar tarea").
  id: string;
  label: string;
  droppable: boolean;
  tasks: TaskRow[];
};

export function DayColumn({
  column,
  moveTargets,
  onStatusChange,
  onMoveToDay,
  onDelete,
}: {
  column: BoardColumn;
  moveTargets: MoveTarget[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMoveToDay: (taskId: string, date: Date) => void;
  onDelete: (task: TaskRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, disabled: !column.droppable });
  const doneCount = column.tasks.filter((task) => task.status === "done").length;

  return (
    <div className="w-[280px] shrink-0 snap-start">
      <div className="flex items-center gap-2 rounded-t-[var(--radius-card)] border border-b-0 border-border-subtle bg-bg-surface px-3 py-2.5">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">{column.label}</h3>
        <span className="numeric shrink-0 text-xs text-text-muted">
          {copy.tareas.board.columnCount(column.tasks.length, doneCount)}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-2 rounded-b-[var(--radius-card)] border border-t-0 border-border-subtle bg-bg-base p-2 transition-colors",
          isOver ? "border-border-strong bg-bg-sunken" : "",
        )}
      >
        {column.tasks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-text-muted">
            {copy.tareas.board.dayEmpty}
          </p>
        ) : (
          column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              moveTargets={moveTargets}
              onStatusChange={(status) => onStatusChange(task.id, status)}
              onMoveToDay={(date) => onMoveToDay(task.id, date)}
              onDelete={() => onDelete(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}
