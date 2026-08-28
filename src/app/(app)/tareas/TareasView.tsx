"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { AlertTriangle, ChevronDown, ListTodo } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { TaskRow } from "@/components/tareas/TaskRow";
import { copy } from "@/config/copy";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useUndoableTaskDelete } from "@/hooks/useUndoableTaskDelete";
import { useTasks, useToggleTask } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";

export function TareasView() {
  const { data, isLoading, isError, refetch } = useTasks();
  const tasks = useMemo(() => data ?? [], [data]);
  const toggleTask = useToggleTask();
  const { remove: deleteTask } = useUndoableTaskDelete();

  // undefined (todavía no medido) cuenta como "sí anima" — el caso común.
  const allowMotion = useMediaQuery("(prefers-reduced-motion: no-preference)");
  const fadeMs = allowMotion === false ? 0 : 300;

  // Mientras una tarea recién marcada/desmarcada "anima", se queda
  // renderizada en su sección DE ORIGEN (con el estado visual ya
  // actualizado) hasta que el fade-out termina — así no salta de golpe
  // a la otra sección.
  const [animatingFrom, setAnimatingFrom] = useState<Map<string, boolean>>(new Map());

  const handleToggle = (id: string, done: boolean) => {
    const wasDone = tasks.find((task) => task.id === id)?.done ?? !done;
    setAnimatingFrom((prev) => new Map(prev).set(id, wasDone));
    toggleTask.mutate({ id, done });
    window.setTimeout(() => {
      setAnimatingFrom((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, fadeMs);
  };

  const pending = tasks.filter((task) => {
    const from = animatingFrom.get(task.id);
    return from === undefined ? !task.done : from === false;
  });
  const completed = tasks.filter((task) => {
    const from = animatingFrom.get(task.id);
    return from === undefined ? task.done : from === true;
  });

  const [completedOpen, setCompletedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.shell.nav.tasks} />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={copy.tareas.emptyTitle}
          description={copy.tareas.emptyDescription}
          cta={{ label: copy.tareas.emptyCta, href: "/contactos" }}
        />
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5">
          {pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-muted">{copy.tareas.allDoneMessage}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {pending.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onDelete={deleteTask}
                  showContact
                  fadingOut={animatingFrom.has(task.id)}
                />
              ))}
            </ul>
          )}

          {completed.length > 0 || animatingFrom.size > 0 ? (
            <Collapsible.Root
              open={completedOpen}
              onOpenChange={setCompletedOpen}
              className="mt-2 border-t border-border-subtle pt-2"
            >
              <Collapsible.Trigger className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] px-2 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-bg-sunken">
                <span>
                  {copy.tareas.completedTitle} ({completed.length})
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 text-text-muted transition-transform duration-200",
                    completedOpen ? "rotate-180" : "",
                  )}
                  strokeWidth={1.5}
                />
              </Collapsible.Trigger>
              <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                <ul className="flex flex-col divide-y divide-border-subtle px-2">
                  {completed.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={deleteTask}
                      showContact
                      fadingOut={animatingFrom.has(task.id)}
                    />
                  ))}
                </ul>
              </Collapsible.Content>
            </Collapsible.Root>
          ) : null}
        </div>
      )}
    </div>
  );
}

