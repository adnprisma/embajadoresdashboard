"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { tasksKeys, useDeleteTask, type TaskRow } from "@/lib/queries/tasks";

const UNDO_WINDOW_MS = 5000;

// Borrado de tareas SIN AlertDialog (a propósito — una tarea es barata de
// recrear y una confirmación estorba más de lo que protege). En su lugar:
// se quita de la vista al instante y el borrado real en la base de datos
// se retrasa 5s, dando tiempo a deshacer desde el toast antes de que
// ocurra de verdad.
export function useUndoableTaskDelete() {
  const queryClient = useQueryClient();
  const deleteTask = useDeleteTask();
  const pending = useRef(new Map<string, { task: TaskRow; timeoutId: number }>());

  const removeFromCaches = (id: string) => {
    queryClient.setQueriesData<TaskRow[]>({ queryKey: tasksKeys.all }, (old) =>
      old ? old.filter((task) => task.id !== id) : old,
    );
  };

  const restoreToCaches = (task: TaskRow) => {
    queryClient.setQueriesData<TaskRow[]>({ queryKey: tasksKeys.all }, (old) =>
      old ? [...old, task] : old,
    );
  };

  const remove = (task: TaskRow) => {
    removeFromCaches(task.id);

    const timeoutId = window.setTimeout(() => {
      pending.current.delete(task.id);
      deleteTask.mutate(task.id, {
        onError: () => restoreToCaches(task),
      });
    }, UNDO_WINDOW_MS);

    pending.current.set(task.id, { task, timeoutId });

    toast(copy.tareas.deleteToast, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: copy.tareas.undoLabel,
        onClick: () => {
          const entry = pending.current.get(task.id);
          if (!entry) return;
          window.clearTimeout(entry.timeoutId);
          pending.current.delete(task.id);
          restoreToCaches(entry.task);
        },
      },
    });
  };

  return { remove };
}
