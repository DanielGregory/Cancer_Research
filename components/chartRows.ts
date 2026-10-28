import type { ChartRow } from "./TimeSeriesChart";

/** Max points sent to a chart; the solver itself keeps every step. */
export const MAX_CHART_POINTS = 600;

interface BuildRowsOptions {
  /** Drop values ≤ 0 (log axes can't show them). */
  logScale?: boolean;
  /**
   * Keep every point where any column changes value. Use for step signals
   * like drug concentration, where a coarse stride could skip a short pulse.
   */
  keepChanges?: boolean;
}

/**
 * Turn parallel arrays into chart rows: { t, [key]: value }.
 * All columns must share the time grid `t`.
 *
 * Downsampling only affects drawing; the solver's accuracy is unchanged.
 */
export function buildRows(
  t: number[],
  columns: Record<string, number[]>,
  { logScale = false, keepChanges = false }: BuildRowsOptions = {},
): ChartRow[] {
  const keys = Object.keys(columns);
  const stride = Math.max(1, Math.ceil(t.length / MAX_CHART_POINTS));
  const clean = (v: number) => (logScale && v <= 0 ? null : v);

  const rows: ChartRow[] = [];
  for (let i = 0; i < t.length; i++) {
    const isLast = i === t.length - 1;
    const changes = keepChanges && i > 0 && keys.some((k) => columns[k][i] !== columns[k][i - 1]);
    if (i % stride !== 0 && !isLast && !changes) continue;

    const row: ChartRow = { t: t[i] };
    for (const k of keys) row[k] = clean(columns[k][i]);
    rows.push(row);
  }
  return rows;
}
