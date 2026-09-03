"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getOwnerId } from "@/lib/supabase/get-owner-id";

// Los únicos 3 tipos que llevan fila propia (ver 0022_seller_prices.sql) —
// gestión es precio fijo de Prisma y nunca aparece aquí.
export type SellerPriceItemType = "paquete" | "adn" | "producto";

export type SellerPriceRow = {
  itemType: SellerPriceItemType;
  itemId: string;
  price: number;
  updatedAt: string;
};

export const sellerPricesKeys = {
  all: ["sellerPrices"] as const,
  forSeller: (sellerId: string) => [...sellerPricesKeys.all, sellerId] as const,
};

// sellerId opcional: sin él, trae los precios de quien tiene la sesión
// (uso normal en /perfil). Con él, trae los de otra persona — para cuando
// exista la comparación de equipo (bloque 6), ya solo falta la pantalla.
export function useSellerPrices(sellerId?: string) {
  return useQuery({
    queryKey: sellerId ? sellerPricesKeys.forSeller(sellerId) : [...sellerPricesKeys.all, "self"],
    queryFn: async (): Promise<SellerPriceRow[]> => {
      const supabase = createClient();
      const resolvedSellerId = sellerId ?? (await getOwnerId());
      const { data, error } = await supabase
        .from("seller_prices")
        .select("item_type, item_id, price, updated_at")
        .eq("seller_id", resolvedSellerId);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        itemType: row.item_type as SellerPriceItemType,
        itemId: row.item_id,
        price: row.price,
        updatedAt: row.updated_at,
      }));
    },
  });
}

// Sin fila propia = sigue el catálogo. Nunca se siembra una fila solo para
// "confirmar" el precio de catálogo — evita 33 filas por vendedora nueva y
// hace imposible que se desincronicen con un aumento de catálogo futuro.
export function resolveSellerPrice(
  sellerPrices: SellerPriceRow[],
  itemType: SellerPriceItemType,
  itemId: string,
  catalogPrice: number,
): number {
  const override = sellerPrices.find((row) => row.itemType === itemType && row.itemId === itemId);
  return override ? override.price : catalogPrice;
}

export type SellerPriceChange = {
  itemType: SellerPriceItemType;
  itemId: string;
  price: number;
};

// Un guardado = un toast, aunque hayan cambiado varias filas a la vez — cada
// fila cambiada pasa por update_seller_price() (upsert + log en la misma
// función, ver la migración), pero el usuario ve un solo resultado honesto
// ("N precios actualizados"), no N toasts sueltos.
export function useUpdateSellerPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: SellerPriceChange[]) => {
      const supabase = createClient();
      for (const change of changes) {
        const { error } = await supabase.rpc("update_seller_price", {
          p_item_type: change.itemType,
          p_item_id: change.itemId,
          p_new_price: change.price,
        });
        if (error) throw error;
      }
      return changes.length;
    },
    onError: () => toast.error(copy.perfil.prices.errorToast),
    onSuccess: (count) => toast.success(copy.perfil.prices.successToast(count)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: sellerPricesKeys.all }),
  });
}
