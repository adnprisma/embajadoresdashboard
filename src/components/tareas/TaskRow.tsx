"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { TaskStatusControl } from "@/components/tareas/TaskStatusControl";
import { copy } from "@/config/copy";
import type { TaskStatus } from "@/config/taskStatus";
import type { TaskRow as TaskRowData } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";

function formatDue(date: string) {
  return format(parseISO(date), "d MMM yyyy", { locale: es });
}

export function TaskRow({
  task,
  onStatusChange,
  onDelete,
  showContact = false,
  fadingOut = false,
}: {
  task: TaskRowData;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (task: TaskRowData) => void;
  showContact?: boolean;
  fadingOut?: boolean;
}) {
  const overdue = task.status !== "done" && !!task.due_at && isPast(parseISO(task.due_at));

  return (
    <li
      className={cn("task-row-fade flex items-center gap-3 py-3", fadingOut ? "opacity-0" : "opacity-100")}
    >
      <TaskStatusControl value={task.status} onChange={(status) => onStatusChange(task.id, status)} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm text-text-primary",
            task.status === "done" ? "text-text-muted line-through" : "",
          )}
        >
          {task.title}
        </p>
        {showContact && task.contact_id && task.contact_business_name ? (
          <Link
            href={`/contactos/${task.contact_id}`}
            className="text-xs text-text-muted underline-offset-2 hover:underline"
          >
            {task.contact_business_name}
          </Link>
        ) : null}
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs",
          overdue ? "font-medium text-state-negative" : "text-text-muted",
        )}
      >
        {overdue ? <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.5} /> : null}
        {task.due_at ? formatDue(task.due_at) : copy.tareas.noDueDate}
        {overdue ? <span className="sr-only"> — {copy.tareas.overdueLabel}</span> : null}
      </span>

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
            className="z-50 w-44 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
          >
            <DropdownMenu.Item
              onSelect={() => onDelete(task)}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.tareas.deleteLabel}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}
