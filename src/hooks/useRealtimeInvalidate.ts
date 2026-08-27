"use client";

import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Se suscribe a postgres_changes de `table` filtrando owner_id=eq.<uid> e
// invalida `queryKey` en cada cambio (insert/update/delete). `queryKey`
// suele venir de una key factory y ser un array literal nuevo en cada
// render — se compara por su serialización, no por referencia, para no
// abrir/cerrar el canal de más.
export function useRealtimeInvalidate(table: string, queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const queryKeyString = JSON.stringify(queryKey);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`realtime:${table}:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `owner_id=eq.${user.id}` },
          () => {
            queryClient.invalidateQueries({ queryKey: JSON.parse(queryKeyString) });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [table, queryClient, queryKeyString]);
}
