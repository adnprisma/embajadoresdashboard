import { cn } from "@/lib/utils/cn";

// Intl.NumberFormat('es-MX'). `.numeric` (tokens.css) aplica
// font-variant-numeric: tabular-nums. `signed` añade +/- vía signDisplay
// ADEMÁS del color — el color nunca es el único portador de la señal.
//
// `amount` nulo exige `emptyLabel` (el union lo fuerza en tiempo de
// compilación): un monto sin capturar (valor estimado antes de tenerlo) no
// se puede renderizar como $0 — cero es una afirmación, no una ausencia.
type MoneyValueProps =
  | { amount: number; currency?: string; signed?: boolean; emptyLabel?: never }
  | { amount: number | null; currency?: string; signed?: boolean; emptyLabel: string };

export function MoneyValue({ amount, currency = "MXN", signed = false, emptyLabel }: MoneyValueProps) {
  if (amount === null) {
    return <span className="numeric font-medium text-text-muted">{emptyLabel}</span>;
  }

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
