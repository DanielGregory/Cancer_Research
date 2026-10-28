import type { ResistanceResult } from "@/lib/scenario/resistanceScenario";
import { formatNumber, type SeriesSpec } from "../TimeSeriesChart";

interface ResistanceSummaryProps {
  runs: { spec: SeriesSpec; result: ResistanceResult }[];
}

/** Key outcomes per run as a table, so the comparison doesn't rely on reading charts. */
export function ResistanceSummary({ runs }: ResistanceSummaryProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-1.5 font-medium">Run</th>
            <th className="py-1.5 text-right font-medium" title="First day the burden exceeds the progression line">
              Time to progression
            </th>
            <th className="py-1.5 text-right font-medium" title="∫C dt up to progression (or the whole run)">
              Drug until then
            </th>
            <th className="py-1.5 text-right font-medium">Smallest burden</th>
            <th className="py-1.5 text-right font-medium">Resistant at end</th>
          </tr>
        </thead>
        <tbody>
          {runs.map(({ spec, result }) => {
            const end = result.t.length - 1;
            const resistantShare = result.R[end] / result.total[end];
            return (
              <tr key={spec.key} className="border-b border-border last:border-0">
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <svg width="16" height="6" aria-hidden>
                      <line x1="0" y1="3" x2="16" y2="3" stroke={spec.color} strokeWidth="2" strokeDasharray={spec.dashed ? "4 3" : undefined} />
                    </svg>
                    {spec.name}
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {result.timeToProgression === null ? `> ${result.t[end]} days` : `day ${result.timeToProgression.toFixed(0)}`}
                </td>
                <td className="py-1.5 text-right tabular-nums">{formatNumber(result.exposureBeforeProgression)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatNumber(Math.min(...result.total))} mm³</td>
                <td className="py-1.5 text-right tabular-nums">{(resistantShare * 100).toFixed(0)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
