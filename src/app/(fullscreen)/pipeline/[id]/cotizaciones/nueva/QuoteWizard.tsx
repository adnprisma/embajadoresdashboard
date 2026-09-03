"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { ContentStep } from "@/components/pipeline/wizard/ContentStep";
import { GestionPlatformStep } from "@/components/pipeline/wizard/GestionPlatformStep";
import { StickyTotalBar } from "@/components/pipeline/wizard/StickyTotalBar";
import { SummaryStep } from "@/components/pipeline/wizard/SummaryStep";
import { buildGenerateQuoteInput, buildPreview, computeRunningTotal } from "@/components/pipeline/wizard/deriveQuote";
import type { WizardState } from "@/components/pipeline/wizard/types";
import { Stepper } from "@/components/common/Stepper";
import { copy } from "@/config/copy";
import type { AdnTier, CatalogProduct, Package } from "@/config/pricing";
import { PLATFORM_CONSUMPTION_TIERS, PLATFORM_PLANS } from "@/config/pricing";
import { useGenerateQuote } from "@/lib/queries/quotes";
import { resolveSellerPrice, useSellerPrices, type SellerPriceItemType } from "@/lib/queries/sellerPrices";

const INITIAL_STATE: WizardState = {
  mode: "pkg",
  packageId: null,
  packagePrice: null,
  extraProducts: [],
  extraAdn: [],
  gestionId: null,
  // [0]! — arrays de catálogo, nunca vacíos (ver pricing.ts): Growth y
  // Ligero, las opciones más económicas, como default razonable.
  platformPlanId: PLATFORM_PLANS[0]!.id,
  platformConsumoId: PLATFORM_CONSUMPTION_TIERS[0]!.id,
  whatsappIncluded: false,
  mesesDiferimiento: 12,
  precioEspecial: null,
};

export function QuoteWizard({
  opportunityId,
  ownerId,
  businessName,
}: {
  opportunityId: string;
  ownerId: string;
  businessName: string;
}) {
  const router = useRouter();
  const { data: sellerPrices } = useSellerPrices(ownerId);
  const generateQuote = useGenerateQuote();

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [precioEspecialInput, setPrecioEspecialInput] = useState("");

  const t = copy.pipeline.wizard;

  const resolvePrice = (itemType: SellerPriceItemType, itemId: string, catalogPrice: number) =>
    resolveSellerPrice(sellerPrices ?? [], itemType, itemId, catalogPrice);

  const handleModeChange = (mode: "pkg" | "custom") => {
    setState((s) => (mode === "pkg" ? { ...s, mode } : { ...s, mode, packageId: null, packagePrice: null }));
  };

  const handleSelectPackage = (pkg: Package) => {
    const defaultPrice = resolvePrice("paquete", pkg.id, pkg.price);
    setState((s) => ({
      ...s,
      packageId: pkg.id,
      packagePrice: defaultPrice,
      // Dedupe: lo que el paquete nuevo ya incluye no se queda marcado como
      // extra — evitaría cobrarlo dos veces (una gratis dentro del
      // paquete, otra como línea aparte).
      extraProducts: s.extraProducts.filter((sel) => !pkg.includedProductIds.includes(sel.itemId)),
      extraAdn: s.extraAdn.filter((sel) => sel.itemId !== pkg.includedAdnTierId),
    }));
  };

  const handlePackagePriceChange = (price: number) => setState((s) => ({ ...s, packagePrice: price }));

  const handleToggleProduct = (product: CatalogProduct, checked: boolean) => {
    setState((s) => ({
      ...s,
      extraProducts: checked
        ? [...s.extraProducts, { itemId: product.id, price: resolvePrice("producto", product.id, product.price) }]
        : s.extraProducts.filter((sel) => sel.itemId !== product.id),
    }));
  };

  const handleProductPriceChange = (itemId: string, price: number) =>
    setState((s) => ({
      ...s,
      extraProducts: s.extraProducts.map((sel) => (sel.itemId === itemId ? { ...sel, price } : sel)),
    }));

  const handleToggleAdn = (tier: AdnTier, checked: boolean) => {
    setState((s) => ({
      ...s,
      extraAdn: checked
        ? [...s.extraAdn, { itemId: tier.id, price: resolvePrice("adn", tier.id, tier.price) }]
        : s.extraAdn.filter((sel) => sel.itemId !== tier.id),
    }));
  };

  const handleAdnPriceChange = (itemId: string, price: number) =>
    setState((s) => ({
      ...s,
      extraAdn: s.extraAdn.map((sel) => (sel.itemId === itemId ? { ...sel, price } : sel)),
    }));

  const handleGestionChange = (gestionId: string | null) => setState((s) => ({ ...s, gestionId }));

  const handlePlatformPlanChange = (planId: string) => {
    const newPlan = PLATFORM_PLANS.find((plan) => plan.id === planId);
    const oldPlan = PLATFORM_PLANS.find((plan) => plan.id === state.platformPlanId);
    setState((s) => ({
      ...s,
      platformPlanId: planId,
      // Si el plan nuevo ya incluye WhatsApp, se prende solo. Si el plan
      // anterior lo incluía gratis y el nuevo no, se apaga — nunca hereda
      // un "incluido" que ahora se cobraría aparte sin que nadie lo haya
      // pedido. Entre dos planes que ninguno lo incluye (Growth↔Pro), se
      // respeta lo que ya había elegido.
      whatsappIncluded: newPlan?.includesWhatsapp ? true : oldPlan?.includesWhatsapp ? false : s.whatsappIncluded,
    }));
  };

  const handlePlatformConsumoChange = (consumoId: string) => setState((s) => ({ ...s, platformConsumoId: consumoId }));
  const handleWhatsappChange = (included: boolean) => setState((s) => ({ ...s, whatsappIncluded: included }));
  const handleMesesChange = (meses: number) => setState((s) => ({ ...s, mesesDiferimiento: meses }));

  const handlePrecioEspecialChange = (value: string) => {
    setPrecioEspecialInput(value);
    setState((s) => ({ ...s, precioEspecial: value === "" ? null : Number(value) }));
  };

  const canProceedFromContent =
    state.mode === "pkg" ? state.packageId !== null : state.extraProducts.length > 0 || state.extraAdn.length > 0;
  const canProceedFromGestionPlatform = state.mesesDiferimiento >= 1;

  const steps = [t.steps.content, t.steps.gestionPlatform, t.steps.summary];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (step === 0 && !canProceedFromContent) return;
    if (step === 1 && !canProceedFromGestionPlatform) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  };
  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const runningTotal = computeRunningTotal(state);
  const preview = buildPreview(state);

  const handleSubmit = async () => {
    const previewedTotal = preview.total;
    const result = await generateQuote.mutateAsync(buildGenerateQuoteInput(opportunityId, state));

    // El servidor nunca recalcula quoted_price, así que en operación normal
    // esto siempre debería coincidir — pero "debería" no es "verificado".
    // Si no coincide, no se oculta ni se corrige a mano: se avisa aparte
    // del toast de éxito, y lo que se muestra después (OpportunityDetailView)
    // siempre lee el total persistido, nunca este preview.
    if (Math.abs(result.total - previewedTotal) > 0.01) {
      toast.warning(t.mismatchWarningToast);
    }

    router.push(`/pipeline/${opportunityId}`);
  };

  return (
    <div className="flex flex-col gap-6 pb-28">
      <PageHeader title={t.title} description={businessName} />

      <Stepper steps={steps} current={step} onStepClick={setStep} />

      {step === 0 ? (
        <ContentStep
          state={state}
          onModeChange={handleModeChange}
          onSelectPackage={handleSelectPackage}
          onPackagePriceChange={handlePackagePriceChange}
          onToggleProduct={handleToggleProduct}
          onProductPriceChange={handleProductPriceChange}
          onToggleAdn={handleToggleAdn}
          onAdnPriceChange={handleAdnPriceChange}
        />
      ) : null}

      {step === 1 ? (
        <GestionPlatformStep
          state={state}
          onGestionChange={handleGestionChange}
          onPlatformPlanChange={handlePlatformPlanChange}
          onPlatformConsumoChange={handlePlatformConsumoChange}
          onWhatsappChange={handleWhatsappChange}
          onMesesChange={handleMesesChange}
        />
      ) : null}

      {step === 2 ? (
        <SummaryStep
          preview={preview}
          precioEspecialInput={precioEspecialInput}
          onPrecioEspecialChange={handlePrecioEspecialChange}
        />
      ) : null}

      <StickyTotalBar
        total={runningTotal}
        step={step}
        totalSteps={steps.length}
        onBack={step > 0 ? handleBack : null}
        onNext={step === 0 ? (canProceedFromContent ? handleNext : null) : step === 1 ? (canProceedFromGestionPlatform ? handleNext : null) : null}
        isLastStep={isLastStep}
        onSubmit={handleSubmit}
        submitting={generateQuote.isPending}
      />
    </div>
  );
}
