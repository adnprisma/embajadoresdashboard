import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const TONE_CLASSES: Record<"warning" | "info", string> = {
  warning: "border-state-pending bg-state-pending-soft",
  info: "border-state-progress bg-state-progress-soft",
};

const TONE_ICON_CLASSES: Record<"warning" | "info", string> = {
  warning: "text-state-pending",
  info: "text-state-progress",
};

export function AlertBanner({
  tone,
  title,
  description,
  icon: Icon,
  href,
}: {
  tone: "warning" | "info";
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3",
        TONE_CLASSES[tone],
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 h-5 w-5 shrink-0", TONE_ICON_CLASSES[tone])}
        strokeWidth={1.5}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
      </div>
      {href ? (
        <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
