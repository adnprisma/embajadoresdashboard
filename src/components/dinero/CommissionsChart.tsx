"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { TooltipContentProps } from "recharts";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type CommissionsChartPoint = { month: string; amount: number };

// `month` viene como "YYYY-MM" (my_dashboard_summary()).
function formatMonthShort(month: string) {
  return format(parseISO(`${month}-01`), "MMM", { locale: es });
}

function formatMonthFull(month: string) {
  const label = format(parseISO(`${month}-01`), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0];
  if (!point) return null;

  const month = (point.payload as CommissionsChartPoint).month;
  const amount = typeof point.value === "number" ? point.value : 0;

  return (
    <div className="rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 shadow-[var(--shadow-raised)]">
      <p className="text-xs font-medium text-text-primary">{formatMonthFull(month)}</p>
      <p className="mt-0.5 text-sm">
        <MoneyValue amount={amount} />
      </p>
    </div>
  );
}

// Barras en coral: es el único elemento gráfico de la pantalla que lo usa
// (dashboard/page.tsx mantiene las StatCard en tonos neutros/de estado a
// propósito, para que el coral no aparezca dos veces con peso).
export function CommissionsChart({ data }: { data: CommissionsChartPoint[] }) {
  const reducedMotion = useReducedMotion();

  return (
    <div>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthShort}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value: number) =>
                new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value)
              }
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              width={40}
            />
            <Tooltip
              content={(props) => <ChartTooltip {...props} />}
              cursor={{ fill: "var(--bg-sunken)" }}
            />
            <Bar
              dataKey="amount"
              fill="var(--coral)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={!reducedMotion}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Misma información en tabla, para quien no puede leer el gráfico. */}
      <table className="sr-only">
        <caption>{copy.dashboard.commissionsChart.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.dashboard.commissionsChart.columnMonth}</th>
            <th scope="col">{copy.dashboard.commissionsChart.columnAmount}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <td>{formatMonthFull(point.month)}</td>
              <td>
                <MoneyValue amount={point.amount} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
