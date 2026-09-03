"use client";

import { useEffect, useMemo, useState } from "react";
import { MoneyValue } from "@/components/common/MoneyValue";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import { ADN_TIERS, PACKAGES, PRODUCT_CATEGORIES, PRODUCTS } from "@/config/pricing";
import {
  resolveSellerPrice,
  useSellerPrices,
  useUpdateSellerPrices,
  type SellerPriceChange,
  type SellerPriceItemType,
} from "@/lib/queries/sellerPrices";

const INPUT_CLASSES =
  "w-32 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary text-right numeric";

function fieldKey(itemType: SellerPriceItemType, itemId: string) {
  return `${itemType}:${itemId}`;
}

type EditableItem = {
  itemType: SellerPriceItemType;
  itemId: string;
  name: string;
  catalogPrice: number;
};

const PACKAGE_ITEMS: EditableItem[] = PACKAGES.map((p) => ({
  itemType: "paquete",
  itemId: p.id,
  name: p.name,
  catalogPrice: p.price,
}));

const ADN_ITEMS: EditableItem[] = ADN_TIERS.map((a) => ({
  itemType: "adn",
  itemId: a.id,
  name: a.name,
  catalogPrice: a.price,
}));

const PRODUCT_ITEMS_BY_CATEGORY = PRODUCT_CATEGORIES.map((cat) => ({
  category: cat,
  items: PRODUCTS.filter((p) => p.categoryId === cat.id).map(
    (p): EditableItem => ({ itemType: "producto", itemId: p.id, name: p.name, catalogPrice: p.price }),
  ),
}));

const ALL_ITEMS: EditableItem[] = [
  ...PACKAGE_ITEMS,
  ...ADN_ITEMS,
  ...PRODUCT_ITEMS_BY_CATEGORY.flatMap((g) => g.items),
];

function PriceRow({
  item,
  value,
  onChange,
}: {
  item: EditableItem;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface px-3 py-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-text-primary">{item.name}</span>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          {copy.perfil.prices.catalogLabel}: <MoneyValue amount={item.catalogPrice} />
        </span>
      </div>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={item.name}
        className={INPUT_CLASSES}
      />
    </div>
  );
}

export function OwnPricesTab() {
  const { data: sellerPrices, isLoading } = useSellerPrices();
  const updatePrices = useUpdateSellerPrices();

  // Snapshot de lo que había al cargar (catálogo o el override guardado) —
  // contra esto se comparan los inputs para saber qué realmente cambió.
  const [loaded, setLoaded] = useState<Record<string, string> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sellerPrices) return;
    const initial: Record<string, string> = {};
    for (const item of ALL_ITEMS) {
      const resolved = resolveSellerPrice(sellerPrices, item.itemType, item.itemId, item.catalogPrice);
      initial[fieldKey(item.itemType, item.itemId)] = String(resolved);
    }
    setLoaded(initial);
    setValues(initial);
  }, [sellerPrices]);

  const changes = useMemo<SellerPriceChange[]>(() => {
    if (!loaded) return [];
    const result: SellerPriceChange[] = [];
    for (const item of ALL_ITEMS) {
      const key = fieldKey(item.itemType, item.itemId);
      const current = values[key];
      if (current === undefined || current === "") continue;
      const currentNum = Number(current);
      if (Number.isNaN(currentNum) || currentNum < 0) continue;
      if (String(currentNum) !== loaded[key]) {
        result.push({ itemType: item.itemType, itemId: item.itemId, price: currentNum });
      }
    }
    return result;
  }, [loaded, values]);

  const hasInvalid = ALL_ITEMS.some((item) => {
    const raw = values[fieldKey(item.itemType, item.itemId)];
    return raw !== undefined && raw !== "" && (Number.isNaN(Number(raw)) || Number(raw) < 0);
  });

  const onSubmit = async () => {
    if (changes.length === 0) return;
    await updatePrices.mutateAsync(changes);
    const nextLoaded = { ...loaded };
    for (const change of changes) {
      nextLoaded[fieldKey(change.itemType, change.itemId)] = String(change.price);
    }
    setLoaded(nextLoaded as Record<string, string>);
  };

  if (isLoading || !loaded) {
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <p className="text-sm text-text-secondary">{copy.perfil.prices.intro}</p>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{copy.perfil.prices.sectionPaquetes}</h3>
        {PACKAGE_ITEMS.map((item) => (
          <PriceRow
            key={fieldKey(item.itemType, item.itemId)}
            item={item}
            value={values[fieldKey(item.itemType, item.itemId)] ?? ""}
            onChange={(next) => setValues((prev) => ({ ...prev, [fieldKey(item.itemType, item.itemId)]: next }))}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{copy.perfil.prices.sectionAdn}</h3>
        {ADN_ITEMS.map((item) => (
          <PriceRow
            key={fieldKey(item.itemType, item.itemId)}
            item={item}
            value={values[fieldKey(item.itemType, item.itemId)] ?? ""}
            onChange={(next) => setValues((prev) => ({ ...prev, [fieldKey(item.itemType, item.itemId)]: next }))}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-text-primary">{copy.perfil.prices.sectionProductos}</h3>
        {PRODUCT_ITEMS_BY_CATEGORY.map((group) => (
          <div key={group.category.id} className="flex flex-col gap-2">
            <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
              {group.category.name}
            </h4>
            {group.items.map((item) => (
              <PriceRow
                key={fieldKey(item.itemType, item.itemId)}
                item={item}
                value={values[fieldKey(item.itemType, item.itemId)] ?? ""}
                onChange={(next) =>
                  setValues((prev) => ({ ...prev, [fieldKey(item.itemType, item.itemId)]: next }))
                }
              />
            ))}
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border-subtle bg-bg-base py-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={changes.length === 0 || hasInvalid || updatePrices.isPending}
          aria-busy={updatePrices.isPending}
          className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
        >
          {updatePrices.isPending ? copy.perfil.prices.submitLoading : copy.perfil.prices.submit}
        </button>
        {changes.length === 0 ? (
          <span className="text-xs text-text-muted">{copy.perfil.prices.noChanges}</span>
        ) : null}
        {hasInvalid ? <span className="text-xs text-state-negative">{copy.perfil.prices.errors.negativeNumber}</span> : null}
      </div>
    </div>
  );
}
