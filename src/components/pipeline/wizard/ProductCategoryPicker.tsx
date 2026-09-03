"use client";

import { Accordion } from "@/components/common/Accordion";
import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import { PRODUCT_CATEGORIES, type CatalogProduct } from "@/config/pricing";
import type { LineSelection } from "./types";

const CHECKBOX_CLASSES = "h-4 w-4 shrink-0 accent-accent";
const PRICE_INPUT_CLASSES =
  "numeric w-28 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-2 py-1 text-right text-sm text-text-primary";

function ProductRow({
  product,
  selection,
  onToggle,
  onPriceChange,
}: {
  product: CatalogProduct;
  selection: LineSelection | undefined;
  onToggle: (checked: boolean) => void;
  onPriceChange: (price: number) => void;
}) {
  const checked = selection !== undefined;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onToggle(event.target.checked)}
          className={CHECKBOX_CLASSES}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary">{product.name}</span>
          <span className="block text-xs text-text-secondary">{product.description}</span>
        </span>
        <MoneyValue amount={product.price} />
      </label>
      {checked ? (
        <div className="flex items-center gap-2 pl-[26px]">
          <span className="text-xs text-text-muted">{copy.pipeline.wizard.content.priceInputLabel}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={selection.price}
            onChange={(event) => onPriceChange(Number(event.target.value))}
            className={PRICE_INPUT_CLASSES}
          />
        </div>
      ) : null}
    </div>
  );
}

// Compartido entre modo paquete ("elementos adicionales") y modo
// personalizada (la selección completa) — mismo componente, distinto
// `availableProducts` (en modo paquete ya viene sin los productos que el
// paquete incluye gratis, ver dedupeAgainstPackage en QuoteWizard).
export function ProductCategoryPicker({
  availableProducts,
  selections,
  onToggle,
  onPriceChange,
}: {
  availableProducts: CatalogProduct[];
  selections: LineSelection[];
  // Responsable de agregar/quitar la selección Y de fijar el precio por
  // default (el propio de la vendedora) cuando se marca — un solo lugar
  // decide eso, ver toggleProduct() en QuoteWizard.
  onToggle: (product: CatalogProduct, checked: boolean) => void;
  onPriceChange: (itemId: string, price: number) => void;
}) {
  const groups = PRODUCT_CATEGORIES.map((category) => ({
    category,
    products: availableProducts.filter((product) => product.categoryId === category.id),
  })).filter((group) => group.products.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {groups.map(({ category, products }) => {
        const selectedCount = products.filter((product) =>
          selections.some((selection) => selection.itemId === product.id),
        ).length;

        return (
          <Accordion
            key={category.id}
            trigger={
              <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                {category.name}
                {selectedCount > 0 ? (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-text-primary">
                    {copy.pipeline.wizard.content.itemCountLabel(selectedCount)}
                  </span>
                ) : null}
              </span>
            }
          >
            <div className="divide-y divide-border-subtle">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  selection={selections.find((selection) => selection.itemId === product.id)}
                  onToggle={(checked) => onToggle(product, checked)}
                  onPriceChange={(price) => onPriceChange(product.id, price)}
                />
              ))}
            </div>
          </Accordion>
        );
      })}
    </div>
  );
}
