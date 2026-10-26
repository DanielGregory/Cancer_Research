"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

export interface SeriesSpec {
  /** Key into each data row. */
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export type ChartRow = { t: number } & Record<string, number | null>;

interface TimeSeriesChartProps {
  data: ChartRow[];
  series: SeriesSpec[];
  yLabel: string;
  height: number;
  logScale?: boolean;
  /** Draw as steps (for piecewise-constant signals like drug concentration). */
  stepped?: boolean;
  /** Formats y values in the tooltip and axis. */
  formatY?: (v: number) => string;
}

/**
 * A line chart of one quantity over time, with one line per run.
 * Separate quantities (tumor size, drug level) get separate charts rather
 * than sharing one plot with two y-axes, which is easy to misread.
 */
export function TimeSeriesChart({
  data,
  series,
  yLabel,
  height,
  logScale,
  stepped,
  formatY = formatNumber,
}: TimeSeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          stroke="var(--border)"
          tickLine={false}
          label={{
            value: "Time (days)",
            position: "insideBottom",
            offset: -12,
            fill: "var(--text-secondary)",
            fontSize: 12,
          }}
        />
        <YAxis
          scale={logScale ? "log" : "linear"}
          domain={logScale ? ["auto", "auto"] : [0, "auto"]}
          allowDataOverflow={logScale}
          tick={{ fill: "var(--text-muted)", fontSize: 12 }}
          stroke="var(--border)"
          tickLine={false}
          tickFormatter={formatY}
          width={64}
          label={{
            value: yLabel,
            angle: -90,
            position: "insideLeft",
            fill: "var(--text-secondary)",
            fontSize: 12,
            style: { textAnchor: "middle" },
          }}
        />
        <Tooltip
          content={(props) => <ChartTooltip {...props} series={series} formatY={formatY} />}
          cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
          isAnimationActive={false}
        />
        {series.length > 1 && (
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            iconType="plainline"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            dataKey={s.key}
            name={s.name}
            type={stepped ? "stepAfter" : "monotone"}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "6 4" : undefined}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface-1)", strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  formatY,
}: TooltipContentProps & { series: SeriesSpec[]; formatY: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-1 px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-primary">Day {Number(label).toFixed(1)}</div>
      {series.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        if (!entry || entry.value == null) return null;
        return (
          <div key={s.key} className="flex items-center gap-2 text-secondary">
            <span className="inline-block h-0.5 w-3" style={{ background: s.color }} />
            <span>{s.name}</span>
            <span className="ml-auto pl-3 tabular-nums text-primary">
              {formatY(Number(entry.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Compact number formatting that copes with both 0.001 and 10,000,000. */
export function formatNumber(v: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-2) return v.toExponential(1);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 1) return v.toFixed(1);
  return v.toFixed(2);
}
