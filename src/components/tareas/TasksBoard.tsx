"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { addDays, format, isBefore, isSameDay, parseISO, startOfDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { copy } from "@/config/copy";
import type { TaskStatus } from "@/config/taskStatus";
import { useUndoableTaskDelete } from "@/hooks/useUndoableTaskDelete";
import { useUpdateTask, useUpdateTaskStatus, type TaskRow } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";
import { DayColumn, type BoardColumn } from "./DayColumn";
import { TaskCard, type MoveTarget } from "./TaskCard";

const WEEKDAY_COUNT = 5;

function combineDateKeepTime(currentDueAt: string | null, targetDate: Date): string {
  const result = new Date(targetDate);
  if (currentDueAt) {
    const time = parseISO(currentDueAt);
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
  } else {
    result.setHours(9, 0, 0, 0);
  }
  return result.toISOString();
}

function dayId(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function weekLabel(weekStart: Date) {
  const friday = addDays(weekStart, 4);
  return `${format(weekStart, "d MMM", { locale: es })} – ${format(friday, "d MMM yyyy", { locale: es })}`;
}

export function TasksBoard({ tasks }: { tasks: TaskRow[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileColumnId, setMobileColumnId] = useState<string | null>(null);

  const updateStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();
  const { remove: deleteTask } = useUndoableTaskDelete();

  const weekdayDates = useMemo(
    () => Array.from({ length: WEEKDAY_COUNT }, (_, n) => addDays(weekStart, n)),
    [weekStart],
  );
  const weekendDates = useMemo(() => [addDays(weekStart, 5), addDays(weekStart, 6)], [weekStart]);
  const today = startOfDay(new Date());

  const { columns } = useMemo(() => {
    const weekdayBuckets: TaskRow[][] = weekdayDates.map(() => []);
    const weekend: TaskRow[] = [];
    const overdue: TaskRow[] = [];
    const noDate: TaskRow[] = [];

    for (const task of tasks) {
      if (!task.due_at) {
        noDate.push(task);
        continue;
      }
      const due = startOfDay(parseISO(task.due_at));
      const weekdayIndex = weekdayDates.findIndex((d) => isSameDay(d, due));
      if (weekdayIndex >= 0) {
        // weekdayIndex viene de findIndex sobre weekdayDates, que tiene el
        // mismo largo que weekdayBuckets — siempre dentro de rango.
        weekdayBuckets[weekdayIndex]!.push(task);
        continue;
      }
      if (weekendDates.some((d) => isSameDay(d, due))) {
        weekend.push(task);
        continue;
      }
      if (task.status !== "done" && isBefore(due, today)) {
        overdue.push(task);
      }
      // Fuera de la semana mostrada y no vencida: le toca a otra semana —
      // se ve al navegar a ella, no aquí.
    }

    const weekdayColumns: BoardColumn[] = weekdayDates.map((date, index) => ({
      id: dayId(date),
      label: format(date, "EEEE d", { locale: es }),
      droppable: true,
      tasks: weekdayBuckets[index]!,
    }));

    const overdueColumn: BoardColumn = {
      id: "overdue",
      label: copy.tareas.board.overdueColumn,
      droppable: false,
      tasks: overdue,
    };

    const cols = [overdueColumn, ...weekdayColumns];
    if (weekend.length > 0) {
      cols.push({ id: "weekend", label: copy.tareas.board.weekendColumn, droppable: false, tasks: weekend });
    }
    if (noDate.length > 0) {
      cols.push({ id: "no_date", label: copy.tareas.board.noDateColumn, droppable: false, tasks: noDate });
    }

    return { columns: cols };
  }, [tasks, weekdayDates, weekendDates, today]);

  const moveTargets: MoveTarget[] = useMemo(
    () => weekdayDates.map((date) => ({ id: dayId(date), date, label: format(date, "EEEE d", { locale: es }) })),
    [weekdayDates],
  );

  const activeTask = tasks.find((task) => task.id === activeId);

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateStatus.mutate({ id: taskId, status });
  };

  const handleMoveToDay = (taskId: string, date: Date) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTask.mutate({ id: taskId, due_at: combineDateKeepTime(task.due_at, date) });
  };

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const targetColumn = moveTargets.find((target) => target.id === over.id);
    if (!targetColumn) return;
    handleMoveToDay(String(active.id), targetColumn.date);
  };

  // Móvil: un día a la vez (5 columnas no caben en 390px) — chips para
  // saltar entre Vencidas, cada día hábil, y Fin de semana/Sin fecha si
  // tienen algo. Sin arrastre en móvil: con una sola columna visible no hay
  // a dónde soltar, se mueve por "Mover a…", que ya es accesible por
  // teclado y funciona igual de bien con el dedo.
  const mobileColumns = columns;
  const todayInWeek = weekdayDates.find((d) => isSameDay(d, today));
  const defaultMobileId = todayInWeek ? dayId(todayInWeek) : dayId(weekdayDates[0]!);
  const selectedMobileId = mobileColumnId ?? defaultMobileId;
  // columns[0] es "Vencidas", columns[1] es siempre el primer día hábil —
  // el respaldo si el id seleccionado ya no existe (p. ej. cambió de
  // semana y ese día quedó vacío y se recalculó la lista).
  const selectedColumn = mobileColumns.find((c) => c.id === selectedMobileId) ?? mobileColumns[1]!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={copy.tareas.board.previousWeek}
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <span className="text-sm font-medium text-text-primary">{weekLabel(weekStart)}</span>
          <button
            type="button"
            aria-label={copy.tareas.board.nextWeek}
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
        >
          {copy.tareas.board.currentWeek}
        </button>
      </div>

      {/* Desktop: todas las columnas, arrastre completo. */}
      <div className="hidden lg:block">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex snap-x snap-proximity gap-4 overflow-x-auto pb-2">
            {columns.map((column) => (
              <DayColumn
                key={column.id}
                column={column}
                moveTargets={moveTargets}
                onStatusChange={handleStatusChange}
                onMoveToDay={handleMoveToDay}
                onDelete={deleteTask}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                moveTargets={moveTargets}
                onStatusChange={() => {}}
                onMoveToDay={() => {}}
                onDelete={() => {}}
                dragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Móvil: un día a la vez. */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2">
          {mobileColumns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => setMobileColumnId(column.id)}
              className={cn(
                "shrink-0 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedColumn.id === column.id
                  ? "border-accent bg-accent-soft text-text-primary"
                  : "border-border-subtle text-text-muted hover:bg-bg-sunken",
              )}
            >
              {column.label} ({column.tasks.length})
            </button>
          ))}
        </div>

        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3">
          {selectedColumn.tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">{copy.tareas.board.dayEmpty}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedColumn.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  moveTargets={moveTargets}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                  onMoveToDay={(date) => handleMoveToDay(task.id, date)}
                  onDelete={() => deleteTask(task)}
                  interactive={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
