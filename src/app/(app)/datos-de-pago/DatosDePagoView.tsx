"use client";

import { AlertTriangle, Banknote, Copy, ExternalLink, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { PAYMENT_MODALITIES, stripeLinkKey, type PaymentModality } from "@/config/appSettings";
import { copy } from "@/config/copy";
import { PACKAGES } from "@/config/pricing";
import { useAppSettings } from "@/lib/queries/appSettings";

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
        <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
      >
        {copy.common.retry}
      </button>
    </div>
  );
}

async function copyToClipboard(value: string, successMessage: string, errorMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error(errorMessage);
  }
}

// Ícono por modalidad — pago único se distingue de las dos recurrentes;
// plan-3 y plan-6 comparten ícono porque su título de panel ("Plan a 3
// meses" / "Plan a 6 meses") ya los distingue, y no hay un ícono de lucide
// que signifique "3" o "6" repeticiones sin inventar algo fuera del set.
const MODALITY_ICON: Record<PaymentModality, LucideIcon> = {
  contado: Banknote,
  "plan-3": Repeat,
  "plan-6": Repeat,
};

// Esta pantalla la ve la vendedora, nunca el cliente (está detrás de
// sesión) — la acción del día a día es copiar el link para mandarlo por
// WhatsApp, no "pagar". Abrir en pestaña nueva es secundario a propósito:
// sirve para la verificación manual de los 9 links (ver
// 0027_stripe_link_modalidad.sql — paquete, monto, cobro único o cuántos
// cobros mensuales), no para el uso diario.
function StripeLinkRow({ packageName, modalityLabel, link }: { packageName: string; modalityLabel: string; link: string | null }) {
  const label = copy.datosPago.stripe.copyButtonLabel(packageName, modalityLabel);

  if (!link) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-muted"
        >
          <Copy aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          {label}
        </button>
        <span className="text-xs font-medium text-text-muted">{copy.datosPago.stripe.pendingLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => copyToClipboard(link, copy.datosPago.stripe.copySuccessToast, copy.datosPago.stripe.copyErrorToast)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
      >
        <Copy aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        {label}
      </button>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={copy.datosPago.stripe.openLabel(packageName, modalityLabel)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
      >
        <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
      </a>
    </div>
  );
}

export function DatosDePagoView() {
  const settingsQuery = useAppSettings();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={copy.datosPago.pageTitle} />

      {settingsQuery.isError ? (
        <Panel title={copy.datosPago.transfer.title}>
          <ErrorBlock onRetry={() => settingsQuery.refetch()} />
        </Panel>
      ) : settingsQuery.isLoading || !settingsQuery.data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          <Panel title={copy.datosPago.transfer.title}>
            <div className="flex flex-col gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- viene de una ruta protegida por sesión, no de un asset optimizable de next/image */}
              <img
                src="/api/datos-pago/header"
                alt={copy.datosPago.headerImageAlt}
                className="w-full max-w-md rounded-[var(--radius-control)] border border-border-subtle"
              />

              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.datosPago.transfer.titularLabel}
                  </dt>
                  <dd className="text-sm text-text-primary">{settingsQuery.data.bank_titular}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.datosPago.transfer.bankLabel}
                  </dt>
                  <dd className="text-sm text-text-primary">{settingsQuery.data.bank_nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.datosPago.transfer.clabeLabel}
                  </dt>
                  <dd className="flex items-center gap-2">
                    <span className="numeric text-sm text-text-primary">{settingsQuery.data.bank_clabe}</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          settingsQuery.data.bank_clabe ?? "",
                          copy.datosPago.transfer.copySuccessToast,
                          copy.datosPago.transfer.copyErrorToast,
                        )
                      }
                      aria-label={copy.datosPago.transfer.copyClabeLabel}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
                    >
                      <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </Panel>

          {PAYMENT_MODALITIES.map((modality) => (
            <Panel key={modality} title={copy.datosPago.stripe.panelTitle[modality]} icon={MODALITY_ICON[modality]}>
              <div className="flex flex-col gap-3">
                {PACKAGES.map((pkg) => (
                  <StripeLinkRow
                    key={pkg.id}
                    packageName={pkg.name}
                    modalityLabel={copy.datosPago.stripe.modalityLabel[modality]}
                    link={settingsQuery.data[stripeLinkKey(modality, pkg.id)] ?? null}
                  />
                ))}
              </div>
            </Panel>
          ))}
        </>
      )}
    </div>
  );
}
