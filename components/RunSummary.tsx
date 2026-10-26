"use client";

import type { ScenarioResult } from "@/lib/scenario/tumorScenario";
import type { SeriesSpec } from "./TimeSeriesChart";
import { formatNumber } from "./TimeSeriesChart";

interface RunSummaryProps {
  runs: { spec: SeriesSpec; result: ScenarioResult }[];
}

/** Key numbers for each run as a table, so the comparison doesn't depend on reading the chart. */
export function RunSummary({ runs }: RunSummaryProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="py-1.5 font-medium">Run</th>
          <th className="py-1.5 text-right font-medium">Final size (mm³)</th>
          <th className="py-1.5 text-right font-medium">Smallest (mm³)</th>
          <th className="py-1.5 text-right font-medium">Peak (mm³)</th>
          <th className="py-1.5 text-right font-medium" title="Area under C(t): total drug delivered">
            Total drug ∫C dt
          </th>
        </tr>
      </thead>
      <tbody>
        {runs.map(({ spec, result }) => (
          <tr key={spec.key} className="border-b border-border last:border-0">
            <td className="py-1.5">
              <span className="flex items-center gap-2">
                <svg width="16" height="6" aria-hidden>
                  <line
                    x1="0"
                    y1="3"
                    x2="16"
                    y2="3"
                    stroke={spec.color}
                    strokeWidth="2"
                    strokeDasharray={spec.dashed ? "4 3" : undefined}
                  />
                </svg>
                {spec.name}
              </span>
            </td>
            <td className="py-1.5 text-right tabular-nums">{formatNumber(result.N.at(-1)!)}</td>
            <td className="py-1.5 text-right tabular-nums">{formatNumber(Math.min(...result.N))}</td>
            <td className="py-1.5 text-right tabular-nums">{formatNumber(Math.max(...result.N))}</td>
            <td className="py-1.5 text-right tabular-nums">{formatNumber(result.exposure)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
