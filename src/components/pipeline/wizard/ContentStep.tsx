"use client";

import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import { ADN_TIERS, PACKAGES, PRODUCTS, type AdnTier, type CatalogProduct, type Package } from "@/config/pricing";
import { cn } from "@/lib/utils/cn";
import { AdnPicker } from "./AdnPicker";
import { ProductCategoryPicker } from "./ProductCategoryPicker";
import type { WizardState } from "./types";

function PackageTile({ pkg, selected, onSelect }: { pkg: Package; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 px-4 py-3 text-center transition-colors",
        selected ? "border-accent bg-accent-soft" : "border-border-subtle bg-bg-surface hover:bg-bg-sunken",
      )}
    >
      <span className="text-sm font-semibold text-text-primary">{pkg.name}</span>
      <MoneyValue amount={pkg.price} />
    </button>
  );
}

const PRICE_INPUT_CLASSES =
  "numeric w-32 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-right text-sm text-text-primary";

export function ContentStep({
  state,
  onModeChange,
  onSelectPackage,
  onPackagePriceChange,
  onToggleProduct,
  onProductPriceChange,
  onToggleAdn,
  onAdnPriceChange,
}: {
  state: WizardState;
  onModeChange: (mode: "pkg" | "custom") => void;
  onSelectPackage: (pkg: Package) => void;
  onPackagePriceChange: (price: number) => void;
  onToggleProduct: (product: CatalogProduct, checked: boolean) => void;
  onProductPriceChange: (itemId: string, price: number) => void;
  onToggleAdn: (tier: AdnTier, checked: boolean) => void;
  onAdnPriceChange: (itemId: string, price: number) => void;
}) {
  const t = copy.pipeline.wizard.content;
  const selectedPackage = state.packageId ? PACKAGES.find((p) => p.id === state.packageId) : null;

  // En modo paquete, lo que ya viene incluido no puede volver a elegirse
  // como "elemento adicional" — evita el doble conteo (el mismo producto
  // cobrado dos veces, una gratis dentro del paquete y otra como extra).
  const availableExtraProducts = selectedPackage
    ? PRODUCTS.filter((product) => !selectedPackage.includedProductIds.includes(product.id))
    : PRODUCTS;
  const availableExtraAdn = selectedPackage
    ? ADN_TIERS.filter((tier) => tier.id !== selectedPackage.includedAdnTierId)
    : ADN_TIERS;

  const includedProducts = selectedPackage
    ? PRODUCTS.filter((product) => selectedPackage.includedProductIds.includes(product.id))
    : [];
  const includedAdn = selectedPackage ? ADN_TIERS.find((tier) => tier.id === selectedPackage.includedAdnTierId) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange("pkg")}
          className={cn(
            "flex-1 rounded-[var(--radius-control)] border-2 px-4 py-2 text-sm font-semibold transition-colors",
            state.mode === "pkg" ? "border-accent bg-accent-soft text-text-primary" : "border-border-subtle text-text-secondary",
          )}
        >
          {t.modePkg}
        </button>
        <button
          type="button"
          onClick={() => onModeChange("custom")}
          className={cn(
            "flex-1 rounded-[var(--radius-control)] border-2 px-4 py-2 text-sm font-semibold transition-colors",
            state.mode === "custom" ? "border-accent bg-accent-soft text-text-primary" : "border-border-subtle text-text-secondary",
          )}
        >
          {t.modeCustom}
        </button>
      </div>

      {state.mode === "pkg" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.packagesTitle}</h3>
            <div className="flex gap-2">
              {PACKAGES.map((pkg) => (
                <PackageTile
                  key={pkg.id}
                  pkg={pkg}
                  selected={state.packageId === pkg.id}
                  onSelect={() => onSelectPackage(pkg)}
                />
              ))}
            </div>
          </div>

          {selectedPackage ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
                <span className="text-sm font-medium text-text-primary">{t.packagePriceLabel}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.packagePrice ?? ""}
                  onChange={(event) => onPackagePriceChange(Number(event.target.value))}
                  className={PRICE_INPUT_CLASSES}
                />
              </div>

              <div className="rounded-[var(--radius-card)] border border-border-subtle bg-bg-sunken p-4">
                <h4 className="text-sm font-semibold text-text-primary">{t.includedTitle}</h4>
                <ul className="mt-2 flex flex-col gap-1">
                  {includedProducts.map((product) => (
                    <li key={product.id} className="text-sm text-text-secondary">
                      {product.name}
                    </li>
                  ))}
                </ul>
                {includedAdn ? (
                  <p className="mt-2 text-xs font-medium text-text-muted">{t.includedAdnLabel(includedAdn.name)}</p>
                ) : null}
              </div>

              <div>
                <h4 className="mb-1 text-sm font-semibold text-text-primary">{t.extrasTitle}</h4>
                <p className="mb-2 text-xs text-text-muted">{t.extrasHint}</p>
                <ProductCategoryPicker
                  availableProducts={availableExtraProducts}
                  selections={state.extraProducts}
                  onToggle={onToggleProduct}
                  onPriceChange={onProductPriceChange}
                />
              </div>

              <AdnPicker
                availableTiers={availableExtraAdn}
                selections={state.extraAdn}
                onToggle={onToggleAdn}
                onPriceChange={onAdnPriceChange}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{t.customTitle}</h3>
            <ProductCategoryPicker
              availableProducts={availableExtraProducts}
              selections={state.extraProducts}
              onToggle={onToggleProduct}
              onPriceChange={onProductPriceChange}
            />
          </div>

          <AdnPicker
            availableTiers={availableExtraAdn}
            selections={state.extraAdn}
            onToggle={onToggleAdn}
            onPriceChange={onAdnPriceChange}
          />
        </div>
      )}
    </div>
  );
}
