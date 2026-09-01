"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import type { TaskStatus } from "@/config/taskStatus";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

export type TaskRow = {
  id: string;
  contact_id: string | null;
  title: string;
  due_at: string | null;
  status: TaskStatus;
  created_at: string;
  contact_business_name: string | null;
};

export type TaskInput = {
  contact_id: string;
  title: string;
  due_at?: string | null;
};

export const tasksKeys = {
  all: ["tasks"] as const,
  list: () => [...tasksKeys.all, "list"] as const,
  mine: () => [...tasksKeys.all, "mine"] as const,
  forContact: (contactId: string) => [...tasksKeys.all, "contact", contactId] as const,
};

// `contacts(business_name)` es un embed de PostgREST vía la FK
// tasks.contact_id -> contacts.id — un solo round trip, sin segunda query.
// `done` (booleano) sigue en la tabla (migración B pendiente, ver
// 0020_task_status.sql) pero ya no se selecciona: el cliente solo lee y
// escribe status.
const TASKS_SELECT = "id, contact_id, title, due_at, status, created_at, contacts(business_name)";

type TaskQueryRow = {
  id: string;
  contact_id: string | null;
  title: string;
  due_at: string | null;
  status: TaskStatus;
  created_at: string;
  contacts: { business_name: string } | { business_name: string }[] | null;
};

function toTaskRow(row: TaskQueryRow): TaskRow {
  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
  return {
    id: row.id,
    contact_id: row.contact_id,
    title: row.title,
    due_at: row.due_at,
    status: row.status,
    created_at: row.created_at,
    contact_business_name: contact?.business_name ?? null,
  };
}

// Team-wide a propósito — RLS le da a admin `owner_id = auth.uid() or
// is_admin()`, así que sin filtro esto muestra las tareas de TODO el
// equipo. Correcto para /contactos (badge de "próxima tarea" por contacto,
// que admin necesita ver de cualquier vendedora). Para /tareas ("Mis
// tareas", pantalla personal) usa useMyTasks(), no esta — ver CLAUDE.md §3.
export function useTasks() {
  return useQuery({
    queryKey: tasksKeys.list(),
    queryFn: async (): Promise<TaskRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select(TASKS_SELECT)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TaskQueryRow[]).map(toTaskRow);
    },
  });
}

// /tareas ("Mis tareas") es una pantalla personal: admin no es excepción,
// nunca debe mezclar las tareas de todo el equipo aquí. Filtro explícito
// por owner_id, sin confiar en RLS — mismo motivo que
// useOwnOpenTaskContactIds() más abajo.
export function useMyTasks() {
  return useQuery({
    queryKey: tasksKeys.mine(),
    queryFn: async (): Promise<TaskRow[]> => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select(TASKS_SELECT)
        .eq("owner_id", ownerId)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TaskQueryRow[]).map(toTaskRow);
    },
  });
}

export function useContactTasks(contactId: string) {
  return useQuery({
    queryKey: tasksKeys.forContact(contactId),
    queryFn: async (): Promise<TaskRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select(TASKS_SELECT)
        .eq("contact_id", contactId)
        .order("due_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as TaskQueryRow[]).map(toTaskRow);
    },
  });
}

// Contact_id de MIS tareas abiertas, para el plan semanal — filtrado
// explícito por owner_id, sin confiar en RLS: desde 0010_rls_admin.sql un
// admin ve las tareas de TODO el equipo, así que useTasks() no sirve aquí
// (mezclaría leads ajenos). "Abierta" = status distinto de 'done' — "en
// proceso" sigue contando como abierta, igual que "pendiente". `enabled`
// para no pedirlo hasta tener el propio id de sesión.
export function useOwnOpenTaskContactIds(ownerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...tasksKeys.all, "openContactIds", ownerId] as const,
    queryFn: async (): Promise<Set<string>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("contact_id")
        .eq("owner_id", ownerId as string)
        .neq("status", "done")
        .not("contact_id", "is", null);
      if (error) throw error;
      return new Set((data as { contact_id: string }[]).map((row) => row.contact_id));
    },
    enabled: enabled && Boolean(ownerId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskInput) => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, owner_id: ownerId })
        .select(TASKS_SELECT)
        .single();
      if (error) throw error;
      return toTaskRow(data as TaskQueryRow);
    },
    onError: () => {
      toast.error(copy.tareas.dialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.tareas.dialog.successToast);
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.list() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.mine() });
      queryClient.invalidateQueries({ queryKey: tasksKeys.forContact(variables.contact_id) });
    },
  });
}

// Puede estar montado a la vez en /tareas (tablero) y en la pestaña Tareas
// de la ficha de un contacto — ambas cachés tienen la misma forma
// (TaskRow[]), así que se actualizan las dos con setQueriesData sobre el
// prefijo tasksKeys.all en vez de adivinar cuál está montada.
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.all });
      const previous = queryClient.getQueriesData<TaskRow[]>({ queryKey: tasksKeys.all });

      queryClient.setQueriesData<TaskRow[]>({ queryKey: tasksKeys.all }, (old) =>
        old ? old.map((task) => (task.id === id ? { ...task, status } : task)) : old,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.tareas.board.statusUpdateErrorToast);
    },
    onSuccess: () => {
      toast.success(copy.tareas.board.statusUpdateSuccessToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

// Cambiar de fecha/hora — el arrastre entre columnas del tablero (solo
// due_at, la hora se conserva) y el diálogo "Editar tarea" (due_at y/o
// title) pasan por aquí. Update directo, sin RPC: mismo dueño de principio
// a fin, sin dinero de por medio — no aplica la regla de CLAUDE.md §3 sobre
// RPC security definer (esa es para dinero/puntos/permisos).
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; title?: string; due_at?: string | null }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update(fields).eq("id", id);
      if (error) throw error;
      return { id, ...fields };
    },
    onMutate: async ({ id, ...fields }) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.all });
      const previous = queryClient.getQueriesData<TaskRow[]>({ queryKey: tasksKeys.all });

      queryClient.setQueriesData<TaskRow[]>({ queryKey: tasksKeys.all }, (old) =>
        old ? old.map((task) => (task.id === id ? { ...task, ...fields } : task)) : old,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.tareas.board.moveErrorToast);
    },
    onSuccess: () => {
      toast.success(copy.tareas.board.taskUpdatedToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

// Plan de acción semanal — un solo RPC para hasta 50 filas, nunca 50
// inserts desde el cliente (ver 0014_generate_weekly_plan.sql). El RPC
// decide cuántas insertó de verdad (salta las que ya tenían tarea esa
// semana) y regresa {created, skipped} — el toast reporta ESE número, no el
// que se pidió crear, para no mentir si algo se saltó en silencio.
export function useGenerateWeeklyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { contact_id: string; title: string; due_at: string }[]) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("generate_weekly_plan", { p_items: items });
      if (error) throw error;
      return data as { created: number; skipped: number };
    },
    onError: () => {
      toast.error(copy.tareas.weeklyPlan.errorToast);
    },
    onSuccess: ({ created, skipped }) => {
      toast.success(copy.tareas.weeklyPlan.resultToast(created, skipped));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}

// Borrado real, de bajo nivel — sin optimismo propio ni toast de éxito: lo
// orquesta useUndoableTaskDelete (quita de caché al instante, espera 5s por
// si hay "Deshacer", y solo entonces llama a esto). El toast que el usuario
// ve es el de esa capa, no esta.
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onError: () => {
      toast.error(copy.tareas.deleteErrorToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksKeys.all });
    },
  });
}
