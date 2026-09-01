"use client";

import { AlertTriangle, ListChecks, ListTodo } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { TasksBoard } from "@/components/tareas/TasksBoard";
import { copy } from "@/config/copy";
import { useMyTasks } from "@/lib/queries/tasks";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

export function TareasView() {
  const { data, isLoading, isError, refetch } = useMyTasks();
  const tasks = useMemo(() => data ?? [], [data]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={copy.shell.nav.tasks}
        action={
          <Link href="/plan-semanal" className={PRIMARY_BUTTON_CLASSES}>
            <ListChecks aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            {copy.tareas.weeklyPlan.cta}
          </Link>
        }
      />

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
        <div className="flex gap-4 overflow-x-auto">
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          illustration={<Illustration name="planear" size="lg" />}
          title={copy.tareas.emptyTitle}
          description={copy.tareas.emptyDescription}
          cta={{ label: copy.tareas.emptyCta, href: "/contactos" }}
        />
      ) : (
        <TasksBoard tasks={tasks} />
      )}
    </div>
  );
}
