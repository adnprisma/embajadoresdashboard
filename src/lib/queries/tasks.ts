"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

export type TaskRow = {
  id: string;
  contact_id: string | null;
  title: string;
  due_at: string | null;
  done: boolean;
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
  forContact: (contactId: string) => [...tasksKeys.all, "contact", contactId] as const,
};

// `contacts(business_name)` es un embed de PostgREST vía la FK
// tasks.contact_id -> contacts.id — un solo round trip, sin segunda query.
const TASKS_SELECT = "id, contact_id, title, due_at, done, created_at, contacts(business_name)";

type TaskQueryRow = {
  id: string;
  contact_id: string | null;
  title: string;
  due_at: string | null;
  done: boolean;
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
    done: row.done,
    created_at: row.created_at,
    contact_business_name: contact?.business_name ?? null,
  };
}

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
// (mezclaría leads ajenos). `enabled` para no pedirlo hasta tener el propio
// id de sesión.
export function useOwnOpenTaskContactIds(ownerId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...tasksKeys.all, "openContactIds", ownerId] as const,
    queryFn: async (): Promise<Set<string>> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("contact_id")
        .eq("owner_id", ownerId as string)
        .eq("done", false)
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
      queryClient.invalidateQueries({ queryKey: tasksKeys.forContact(variables.contact_id) });
    },
  });
}

// El toggle de "hecho" puede estar montado a la vez en /tareas (lista
// global) y en la pestaña Tareas de la ficha de un contacto — ambas cachés
// tienen la misma forma (TaskRow[]), así que se actualizan las dos con
// setQueriesData sobre el prefijo tasksKeys.all en vez de adivinar cuál
// está montada.
export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
      return { id, done };
    },
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: tasksKeys.all });
      const previous = queryClient.getQueriesData<TaskRow[]>({ queryKey: tasksKeys.all });

      queryClient.setQueriesData<TaskRow[]>({ queryKey: tasksKeys.all }, (old) =>
        old ? old.map((task) => (task.id === id ? { ...task, done } : task)) : old,
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.tareas.toggleErrorToast);
    },
    onSuccess: () => {
      toast.success(copy.tareas.toggleSuccessToast);
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
