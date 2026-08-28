"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

// Bucket privado a propósito (ver 0007_perfil_storage.sql) — avatar y
// documentos se muestran vía URL firmada, nunca getPublicUrl().
const BUCKET = "space-perfil";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type BankData = {
  bank_name?: string;
  account_holder?: string;
  clabe?: string;
};

export type TaxData = {
  rfc?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  direccion_fiscal?: string;
};

// PROPUESTA — todavía nadie más lee esta forma (ni una RPC, ni el
// cotizador del bloque 14). No confundir con config/pricing.ts: ese es el
// catálogo MAESTRO de planes de Prisma (hoy vacío, TODO bloque 14); esto es
// lo que CADA usuario decide cobrarle a SUS propios clientes, en conceptos
// libres — no está atado a los planes de pricing.ts porque ese catálogo
// todavía no existe.
export type OwnPriceEntry = {
  id: string;
  label: string;
  monthly: number;
  annual: number;
};

export type OwnPrices = {
  entries: OwnPriceEntry[];
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  billing_complete: boolean;
  bank_data: BankData;
  tax_data: TaxData;
  own_prices: OwnPrices;
};

export type DocumentRow = {
  name: string;
  path: string;
  size: number;
  createdAt: string;
};

export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
  avatarUrl: (path: string) => [...profileKeys.all, "avatarUrl", path] as const,
  documents: () => [...profileKeys.all, "documents"] as const,
};

const PROFILE_SELECT = "id, full_name, email, avatar_url, billing_complete, bank_data, tax_data, own_prices";

function normalizeOwnPrices(value: unknown): OwnPrices {
  if (value && typeof value === "object" && Array.isArray((value as OwnPrices).entries)) {
    return value as OwnPrices;
  }
  return { entries: [] };
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: async (): Promise<Profile> => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const { data, error } = await supabase.from("profiles").select(PROFILE_SELECT).eq("id", ownerId).single();
      if (error) throw error;
      return {
        ...data,
        bank_data: (data.bank_data ?? {}) as BankData,
        tax_data: (data.tax_data ?? {}) as TaxData,
        own_prices: normalizeOwnPrices(data.own_prices),
      };
    },
  });
}

// Solo para la vista previa dentro de esta misma página — TTL corto, no se
// guarda ni se reutiliza en otro lado (ver alcance documentado en
// PersonalDataTab: el avatar no se propaga al UserMenu en este bloque).
export function useAvatarUrl(path: string | null) {
  return useQuery({
    queryKey: profileKeys.avatarUrl(path ?? ""),
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const supabase = createClient();
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!path,
  });
}

export function useUpdatePersonalData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { full_name: string }) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const { error } = await supabase.from("profiles").update(input).eq("id", ownerId);
      if (error) throw error;
    },
    onError: () => toast.error(copy.perfil.personal.errorToast),
    onSuccess: () => toast.success(copy.perfil.personal.successToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail() }),
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blob: Blob) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${ownerId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: blob.type });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", ownerId);
      if (updateError) throw updateError;

      return path;
    },
    onError: () => toast.error(copy.perfil.personal.avatarUploadError),
    onSuccess: () => toast.success(copy.perfil.personal.avatarUploadSuccess),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail() }),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      await supabase.storage.from(BUCKET).remove([path]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", ownerId);
      if (error) throw error;
    },
    onError: () => toast.error(copy.perfil.personal.avatarRemoveError),
    onSuccess: () => toast.success(copy.perfil.personal.avatarUploadSuccess),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail() }),
  });
}

// billing_complete refleja si los campos requeridos están llenos de verdad
// (no es una bandera de un solo sentido): si el usuario borra un campo
// requerido y guarda, vuelve a false — evita que el banner del dashboard
// mienta sobre el estado real. Régimen fiscal y dirección son opcionales.
function isBillingComplete(bank: BankData, tax: TaxData) {
  return Boolean(
    bank.bank_name?.trim() &&
      bank.account_holder?.trim() &&
      bank.clabe?.trim() &&
      tax.rfc?.trim() &&
      tax.razon_social?.trim(),
  );
}

export function useUpdateBillingData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { bank_data: BankData; tax_data: TaxData }) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const billing_complete = isBillingComplete(input.bank_data, input.tax_data);
      const { error } = await supabase
        .from("profiles")
        .update({ ...input, billing_complete })
        .eq("id", ownerId);
      if (error) throw error;
      return billing_complete;
    },
    onError: () => toast.error(copy.perfil.billing.errorToast),
    onSuccess: () => toast.success(copy.perfil.billing.successToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail() }),
  });
}

export function useUpdateOwnPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OwnPrices) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const { error } = await supabase.from("profiles").update({ own_prices: input }).eq("id", ownerId);
      if (error) throw error;
    },
    onError: () => toast.error(copy.perfil.prices.errorToast),
    onSuccess: () => toast.success(copy.perfil.prices.successToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.detail() }),
  });
}

export function useProfileDocuments() {
  return useQuery({
    queryKey: profileKeys.documents(),
    queryFn: async (): Promise<DocumentRow[]> => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(`${ownerId}/documents`, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;

      // list() incluye un placeholder de carpeta sin id cuando no hay
      // archivos reales todavía — se descarta.
      return (data ?? [])
        .filter((item) => item.id !== null)
        .map((item) => ({
          name: item.name,
          path: `${ownerId}/documents/${item.name}`,
          size: item.metadata?.size ?? 0,
          createdAt: item.created_at ?? "",
        }));
    },
  });
}

export async function getDocumentSignedUrl(path: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient();
      const ownerId = await getOwnerId();
      const path = `${ownerId}/documents/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      return path;
    },
    onError: () => toast.error(copy.perfil.documents.uploadError),
    onSuccess: () => toast.success(copy.perfil.documents.uploadSuccess),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.documents() }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (path: string) => {
      const supabase = createClient();
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
      return path;
    },
    onMutate: async (path) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.documents() });
      const previous = queryClient.getQueryData<DocumentRow[]>(profileKeys.documents());

      queryClient.setQueryData<DocumentRow[]>(profileKeys.documents(), (old) =>
        old ? old.filter((doc) => doc.path !== path) : old,
      );

      return { previous };
    },
    onError: (_error, _path, context) => {
      if (context?.previous) queryClient.setQueryData(profileKeys.documents(), context.previous);
      toast.error(copy.perfil.documents.deleteErrorToast);
    },
    onSuccess: () => toast.success(copy.perfil.documents.deleteSuccessToast),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profileKeys.documents() }),
  });
}
