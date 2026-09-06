"use client";

import { AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { stripeLinkKey } from "@/config/appSettings";
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

async function copyClabe(clabe: string) {
  try {
    await navigator.clipboard.writeText(clabe);
    toast.success(copy.datosPago.transfer.copySuccessToast);
  } catch {
    toast.error(copy.datosPago.transfer.copyErrorToast);
  }
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
                      onClick={() => copyClabe(settingsQuery.data.bank_clabe ?? "")}
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

          <Panel title={copy.datosPago.stripe.title}>
            <div className="flex flex-wrap gap-3">
              {PACKAGES.map((pkg) => {
                const link = settingsQuery.data[stripeLinkKey(pkg.id)];
                return link ? (
                  <a
                    key={pkg.id}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90"
                  >
                    {copy.datosPago.stripe.payButtonLabel(pkg.name)}
                  </a>
                ) : (
                  <button
                    key={pkg.id}
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-4 py-2 text-sm font-medium text-text-muted"
                  >
                    {copy.datosPago.stripe.payButtonLabel(pkg.name)} — {copy.datosPago.stripe.pendingLabel}
                  </button>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
