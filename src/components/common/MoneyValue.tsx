import { cn } from "@/lib/utils/cn";

// Intl.NumberFormat('es-MX'). `.numeric` (tokens.css) aplica
// font-variant-numeric: tabular-nums. `signed` añade +/- vía signDisplay
// ADEMÁS del color — el color nunca es el único portador de la señal.
export function MoneyValue({
  amount,
  currency = "MXN",
  signed = false,
}: {
  amount: number;
  currency?: string;
  signed?: boolean;
}) {
  const formatted = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(amount);

  const toneClass = !signed
    ? "text-text-primary"
    : amount > 0
      ? "text-state-positive"
      : amount < 0
        ? "text-state-negative"
        : "text-text-primary";

  return <span className={cn("numeric font-medium", toneClass)}>{formatted}</span>;
}
