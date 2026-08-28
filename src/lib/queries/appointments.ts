"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

export type AppointmentStatus = "scheduled" | "done" | "cancelled";

export type AppointmentRow = {
  id: string;
  owner_id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  visibility: string;
  url: string | null;
  isMine: boolean;
};

export type AppointmentInput = {
  contact_id?: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  visibility?: "private" | "team";
};

export const appointmentsKeys = {
  all: ["appointments"] as const,
  // El rango es el de la rejilla de 42 días de MonthGrid — cubre de sobra
  // cualquier semana o vista de agenda dentro del mismo mes visible, así
  // que las 3 vistas comparten una sola query por posición del cursor.
  range: (startISO: string, endISO: string) => [...appointmentsKeys.all, "range", startISO, endISO] as const,
};

const APPOINTMENTS_SELECT = "id, owner_id, contact_id, title, starts_at, ends_at, status, visibility, url";

// RLS ya combina "lo mío" (appointments_owner_all) con "lo del equipo que
// alguien compartió" (appointments_team_select, visibility='team') — un
// select plano ya trae ambos conjuntos. `isMine` es lo que decide edición:
// no `visibility`, porque un evento propio marcado 'team' sigue siendo tuyo
// (ver 0002_rls.sql: update/delete quedan SIEMPRE restringidos al dueño).
export function useAppointments(rangeStart: Date, rangeEnd: Date) {
  const startISO = rangeStart.toISOString();
  const endISO = rangeEnd.toISOString();

  return useQuery({
    queryKey: appointmentsKeys.range(startISO, endISO),
    queryFn: async (): Promise<AppointmentRow[]> => {
      const [ownerId, result] = await Promise.all([
        getOwnerId(),
        createClient()
          .from("appointments")
          .select(APPOINTMENTS_SELECT)
          .gte("starts_at", startISO)
          .lte("starts_at", endISO)
          .order("starts_at", { ascending: true }),
      ]);
      if (result.error) throw result.error;
      return result.data.map((row) => ({ ...row, isMine: row.owner_id === ownerId }));
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...input, owner_id: ownerId })
        .select(APPOINTMENTS_SELECT)
        .single();
      if (error) throw error;
      return { ...data, isMine: true };
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: appointmentsKeys.all });
      const previous = queryClient.getQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all });

      const optimisticRow: AppointmentRow = {
        id: `optimistic-${Date.now()}`,
        owner_id: "",
        contact_id: input.contact_id ?? null,
        title: input.title,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        status: input.status,
        visibility: input.visibility ?? "private",
        url: null,
        isMine: true,
      };

      queryClient.setQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all }, (old) =>
        old ? [...old, optimisticRow] : old,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.calendario.dialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.calendario.dialog.successCreateToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appointments")
        .update(input)
        .eq("id", id)
        .select(APPOINTMENTS_SELECT)
        .single();
      if (error) throw error;
      return { ...data, isMine: true };
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: appointmentsKeys.all });
      const previous = queryClient.getQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all });

      queryClient.setQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all }, (old) =>
        old
          ? old.map((appointment) =>
              appointment.id === id
                ? {
                    ...appointment,
                    contact_id: input.contact_id ?? null,
                    title: input.title,
                    starts_at: input.starts_at,
                    ends_at: input.ends_at,
                    status: input.status,
                    visibility: input.visibility ?? appointment.visibility,
                  }
                : appointment,
            )
          : old,
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.calendario.dialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.calendario.dialog.successEditToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: appointmentsKeys.all });
      const previous = queryClient.getQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all });

      queryClient.setQueriesData<AppointmentRow[]>({ queryKey: appointmentsKeys.all }, (old) =>
        old ? old.filter((appointment) => appointment.id !== id) : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      context?.previous?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(copy.calendario.dialog.deleteErrorToast);
    },
    onSuccess: () => {
      toast.success(copy.calendario.dialog.deleteSuccessToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentsKeys.all });
    },
  });
}
