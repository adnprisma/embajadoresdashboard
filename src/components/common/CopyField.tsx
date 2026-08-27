"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { copy } from "@/config/copy";

export function CopyField({
  label,
  value,
  secondaryActions,
}: {
  label: string;
  value: string;
  secondaryActions?: { label: string; onClick: () => void }[];
}) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Sin acceso al portapapeles (permiso denegado, contexto no seguro).
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator.share !== "function") return;
    try {
      await navigator.share({ text: value });
    } catch {
      // El usuario cerró el share sheet sin elegir nada; no es un error real.
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-[var(--radius-control)] border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-sm text-text-primary">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copy.common.copyFieldCopyLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border-subtle text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4 text-state-positive" strokeWidth={2} />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
        {canShare ? (
          <button
            type="button"
            onClick={handleShare}
            aria-label={copy.common.copyFieldShareLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-border-subtle text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary lg:hidden"
          >
            <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="h-4 text-xs text-state-positive">
        {copied ? copy.common.copyFieldCopied : ""}
      </p>
      {secondaryActions && secondaryActions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {secondaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="text-sm text-text-secondary underline-offset-2 hover:underline"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
