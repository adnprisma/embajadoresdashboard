// Placeholder neutro. El logotipo real está en revisión y NO está aprobado
// (CLAUDE.md §2). No le des forma de marca: es un marcador geométrico.
// Ver BRANDING.md para dónde sustituirlo.
import { BRAND } from "@/config/brand";

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label={BRAND.name}>
      <span
        aria-hidden="true"
        className="inline-block h-8 w-8 rounded-[var(--radius-control)] border border-[var(--border-strong)] bg-[var(--bg-surface)]"
      />
      <span className="font-[var(--font-display)] text-lg text-[var(--text-primary)]">
        {BRAND.name}
      </span>
    </div>
  );
}
