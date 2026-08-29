"use client";

// ---------------------------------------------------------------
// TECHO DE LA ESTRATEGIA — léelo antes de tocar este archivo.
//
// useContacts() trae la tabla ENTERA en bloques de PAGE_SIZE (.range()),
// y todo lo demás — búsqueda, filtro de giro, filtro de etiqueta,
// virtualización del DataTable — corre 100% en cliente sobre ese arreglo
// ya completo (por eso la búsqueda se siente instantánea: no hay red de
// por medio en cada tecleo).
//
// Es la decisión correcta mientras la cartera de contactos de un usuario
// se mantenga por debajo de ~5,000 filas. Más allá de eso, el costo deja
// de ser el round-trip (ya no hay) y pasa a ser: memoria del navegador,
// tiempo de la primera carga, y CPU en cada tecleo al filtrar miles de
// filas en el hilo principal.
//
// Cuando ese techo se acerque, la búsqueda y los filtros tienen que
// moverse al servidor:
//   - reemplazar el filtro de texto en cliente por .textSearch() sobre
//     contacts_search_idx (el índice gin ya existe desde 0001_schema.sql,
//     solo falta usarlo — hoy ese índice no lo consulta nadie).
//   - reemplazar "traer todo + virtualizar" por paginación real
//     (.range() ya no para traer TODO, sino para traer una página a la
//     vez) con los filtros aplicados del lado de Supabase.
//   - las opciones de giro/etiqueta (hoy derivadas del arreglo completo)
//     pasarían a salir de una consulta propia (ej. un RPC con `distinct`),
//     no de recorrer todas las filas ya cargadas.
// ---------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

export type ContactRow = {
  id: string;
  owner_id: string;
  owner_full_name: string | null;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
};

// profiles(full_name) es un embed de PostgREST vía contacts.owner_id ->
// profiles.id — quién es "la vendedora" de este contacto. Solo lo consume
// la UI de admin (columna, filtro, diálogo de reasignación); para una
// seller es siempre su propio nombre, sin costo extra real.
type ContactQueryRow = {
  id: string;
  owner_id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  industry: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

function toContactRow(row: ContactQueryRow): ContactRow {
  const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    owner_id: row.owner_id,
    owner_full_name: owner?.full_name ?? null,
    business_name: row.business_name,
    contact_name: row.contact_name,
    phone: row.phone,
    email: row.email,
    industry: row.industry,
    tags: row.tags,
    notes: row.notes,
    created_at: row.created_at,
  };
}

export type ContactInput = {
  business_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  industry?: string | null;
  tags?: string[];
  notes?: string | null;
};

export const contactsKeys = {
  all: ["contacts"] as const,
  list: () => [...contactsKeys.all, "list"] as const,
  detail: (id: string) => [...contactsKeys.all, "detail", id] as const,
};

const CONTACTS_SELECT =
  "id, owner_id, business_name, contact_name, phone, email, industry, tags, notes, created_at, profiles(full_name)";

// PAGE_SIZE es el tamaño de bloque de .range(), no una página de UI: existe
// porque un select() sin rango tiene un tope por defecto en PostgREST, y
// hay que agotar la tabla en bloques para garantizar que llega completa.
const PAGE_SIZE = 500;
const MAX_PAGES = 50; // tope defensivo: 25,000 filas, muy por encima del techo de ~5,000 de arriba.

export function useContacts() {
  return useQuery({
    queryKey: contactsKeys.list(),
    queryFn: async () => {
      const supabase = createClient();
      const rows: ContactRow[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("contacts")
          .select(CONTACTS_SELECT)
          .order("business_name", { ascending: true })
          .range(from, to);

        if (error) throw error;

        rows.push(...(data as ContactQueryRow[] | null ?? []).map(toContactRow));

        if (!data || data.length < PAGE_SIZE) break;
      }

      return rows;
    },
  });
}

// `initialData` viene del fetch server-side de la página de detalle
// (contactos/[id]/page.tsx) — así no hay un segundo viaje de red solo para
// mostrar lo mismo que el servidor ya mandó.
export function useContact(id: string, initialData?: ContactRow) {
  return useQuery({
    queryKey: contactsKeys.detail(id),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select(CONTACTS_SELECT)
        .eq("id", id)
        .single();
      if (error) throw error;
      return toContactRow(data as ContactQueryRow);
    },
    initialData,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContactInput) => {
      const ownerId = await getOwnerId();
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...input, owner_id: ownerId })
        .select(CONTACTS_SELECT)
        .single();
      if (error) throw error;
      return toContactRow(data as ContactQueryRow);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: contactsKeys.list() });
      const previous = queryClient.getQueryData<ContactRow[]>(contactsKeys.list());

      // owner_id/owner_full_name quedan vacíos en el optimista a propósito:
      // resolverlos de verdad implicaría un round-trip (rompe el punto de
      // ser optimista) y se corrigen solos en cuanto la mutación real
      // resuelve e invalida la lista.
      const optimisticRow: ContactRow = {
        id: `optimistic-${Date.now()}`,
        owner_id: "",
        owner_full_name: null,
        business_name: input.business_name,
        contact_name: input.contact_name ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        industry: input.industry ?? null,
        tags: input.tags ?? [],
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ContactRow[]>(contactsKeys.list(), (old) =>
        old ? [optimisticRow, ...old] : [optimisticRow],
      );

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(contactsKeys.list(), context.previous);
      toast.error(copy.contactos.form.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.contactos.form.successCreateToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.list() });
    },
  });
}

// Un chunk del importador masivo (ImportDialog) — el owner lo valida
// import_contacts() en el servidor, nunca el cliente: un no-admin no puede
// lograr que se le acepte un owner_id que no sea el suyo ni manipulando la
// petición. Sin toast/invalidate propios: ImportDialog corre esto varias
// veces en un loop (uno por chunk) y decide cuándo mostrar el resultado e
// invalidar la lista, igual que antes con el insert directo.
export function useImportContacts() {
  return useMutation({
    mutationFn: async ({
      contacts,
      owner,
      reason,
    }: {
      contacts: ContactInput[];
      owner: string;
      reason: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("import_contacts", {
        p_contacts: contacts,
        p_owner: owner,
        p_reason: reason,
      });
      if (error) throw error;
      return data as number;
    },
  });
}

// Conteo de lo que referencia a este contacto en otras tablas, usado por el
// diálogo de borrado para decir con números reales qué se va a eliminar en
// cascada (tasks, interactions — on delete cascade) y qué solo se desvincula
// (opportunities, appointments — on delete set null). Ver 0001_schema.sql.
// `enabled` se controla desde fuera: solo corre mientras el diálogo de
// confirmación está abierto, no en cada visita a la ficha.
export type ContactRelatedCounts = {
  tasks: number;
  interactions: number;
  opportunities: number;
  appointments: number;
};

export function useContactRelatedCounts(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...contactsKeys.detail(id), "related-counts"],
    queryFn: async (): Promise<ContactRelatedCounts> => {
      const supabase = createClient();
      const [tasks, interactions, opportunities, appointments] = await Promise.all([
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("contact_id", id),
        supabase.from("interactions").select("id", { count: "exact", head: true }).eq("contact_id", id),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("contact_id", id),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("contact_id", id),
      ]);

      for (const result of [tasks, interactions, opportunities, appointments]) {
        if (result.error) throw result.error;
      }

      return {
        tasks: tasks.count ?? 0,
        interactions: interactions.count ?? 0,
        opportunities: opportunities.count ?? 0,
        appointments: appointments.count ?? 0,
      };
    },
    enabled,
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: contactsKeys.list() });
      const previous = queryClient.getQueryData<ContactRow[]>(contactsKeys.list());

      queryClient.setQueryData<ContactRow[]>(contactsKeys.list(), (old) =>
        old ? old.filter((contact) => contact.id !== id) : old,
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(contactsKeys.list(), context.previous);
      toast.error(copy.contactos.detail.deleteDialog.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.contactos.detail.deleteDialog.successToast);
    },
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.list() });
      queryClient.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
  });
}

export function useUpdateContact(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContactInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .update(input)
        .eq("id", id)
        .select(CONTACTS_SELECT)
        .single();
      if (error) throw error;
      return toContactRow(data as ContactQueryRow);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: contactsKeys.detail(id) });
      const previous = queryClient.getQueryData<ContactRow>(contactsKeys.detail(id));

      if (previous) {
        queryClient.setQueryData<ContactRow>(contactsKeys.detail(id), {
          ...previous,
          ...input,
          contact_name: input.contact_name ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          industry: input.industry ?? null,
          tags: input.tags ?? [],
          notes: input.notes ?? null,
        });
      }

      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(contactsKeys.detail(id), context.previous);
      toast.error(copy.contactos.form.errorToast);
    },
    onSuccess: () => {
      toast.success(copy.contactos.form.successEditToast);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: contactsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: contactsKeys.list() });
    },
  });
}
