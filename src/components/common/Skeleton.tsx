import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[var(--radius-control)] bg-bg-sunken motion-reduce:animate-none",
        className,
      )}
    />
  );
}
