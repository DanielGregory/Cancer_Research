"use client";

import { useMemo, useState } from "react";
import type { DosingSchedule } from "@/lib/dosing";
import {
  GROWTH_PARAM_SPECS,
  KILL_RATE_SPEC,
  N0_SPEC,
  getGrowthModel,
  type GrowthModelId,
  type GrowthParamKey,
  type GrowthParamValues,
} from "@/lib/models";
import { runTumorScenario, type ScenarioResult } from "@/lib/scenario/tumorScenario";
import { ExplanationPanel } from "./ExplanationPanel";
import { RunSummary } from "./RunSummary";
import { TimeSeriesChart, type ChartRow, type SeriesSpec } from "./TimeSeriesChart";
import { DosingControls } from "./controls/DosingControls";
import { ModelSelector } from "./controls/ModelSelector";
import { Slider } from "./controls/Slider";

/** Solver step in days. Small relative to the shortest pulse (0.5 days). */
const DT = 0.05;
/** Max points sent to the chart; the solver itself keeps every step. */
const MAX_CHART_POINTS = 600;

const RUN_A: SeriesSpec = { key: "a", name: "Run A", color: "var(--series-a)" };
const RUN_B: SeriesSpec = { key: "b", name: "Run B", color: "var(--series-b)", dashed: true };

export function Simulator() {
  // Shared biology: both runs use the same tumor, only the dosing differs.
  const [modelId, setModelId] = useState<GrowthModelId>("logistic");
  const [params, setParams] = useState<GrowthParamValues>({ r: 0.1, K: 2000 });
  const [N0, setN0] = useState(50);
  const [k, setK] = useState(0.08);
  const [tEnd, setTEnd] = useState(150);

  // Per-run dosing. Defaults deliver the same total drug, two different ways.
  const [dosingA, setDosingA] = useState<DosingSchedule>({ kind: "constant", level: 1, start: 30 });
  const [dosingB, setDosingB] = useState<DosingSchedule>({
    kind: "pulsed",
    dose: 2,
    onDuration: 7,
    offDuration: 7,
    start: 30,
  });
  const [compare, setCompare] = useState(true);
  const [logScale, setLogScale] = useState(false);

  const model = getGrowthModel(modelId);

  // Re-solve whenever an input changes. Each solve is a few thousand RK4
  // steps, which is fast enough to run on every slider movement.
  const resultA = useMemo(
    () => runTumorScenario({ modelId, params, N0, k, tEnd, dt: DT, dosing: dosingA }),
    [modelId, params, N0, k, tEnd, dosingA],
  );
  const resultB = useMemo(
    () => (compare ? runTumorScenario({ modelId, params, N0, k, tEnd, dt: DT, dosing: dosingB }) : null),
    [compare, modelId, params, N0, k, tEnd, dosingB],
  );

  const series = compare ? [RUN_A, RUN_B] : [RUN_A];
  const sizeData = useMemo(() => toRows(resultA, resultB, "N", logScale), [resultA, resultB, logScale]);
  const drugData = useMemo(() => toRows(resultA, resultB, "C", false), [resultA, resultB]);

  const setParam = (key: GrowthParamKey, value: number) => setParams((p) => ({ ...p, [key]: value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ── Controls ─────────────────────────────────────────── */}
      <aside className="space-y-6 rounded-xl border border-border bg-surface-1 p-4">
        <ModelSelector value={modelId} onChange={setModelId} />

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Tumor</h2>
          {(Object.keys(GROWTH_PARAM_SPECS) as GrowthParamKey[]).map((key) => {
            const spec = GROWTH_PARAM_SPECS[key];
            const used = (model.paramKeys as readonly GrowthParamKey[]).includes(key);
            return (
              <Slider
                key={key}
                {...spec}
                value={params[key]}
                onChange={(v) => setParam(key, v)}
                disabled={!used}
                description={used ? spec.description : `Not used by the ${model.name} model.`}
              />
            );
          })}
          <Slider {...N0_SPEC} value={N0} onChange={setN0} />
          <Slider {...KILL_RATE_SPEC} value={k} onChange={setK} />
          <Slider label="Simulate for" unit="days" value={tEnd} min={10} max={365} step={5} onChange={setTEnd} />
        </section>

        <DosingControls title="Run A dosing" color={RUN_A.color} value={dosingA} onChange={setDosingA} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Compare with a second dosing schedule
        </label>

        {compare && (
          <DosingControls
            title="Run B dosing"
            color={RUN_B.color}
            dashed
            value={dosingB}
            onChange={setDosingB}
          />
        )}
      </aside>

      {/* ── Results ──────────────────────────────────────────── */}
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Tumor size N(t)</h2>
            <label className="flex items-center gap-2 text-xs text-secondary">
              <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} />
              Log scale
            </label>
          </div>
          <TimeSeriesChart data={sizeData} series={series} yLabel="Volume (mm³)" height={340} logScale={logScale} />

          <h2 className="mt-4 mb-2 text-sm font-semibold">Drug concentration C(t)</h2>
          <TimeSeriesChart data={drugData} series={series} yLabel="Conc." height={140} stepped />

          <div className="mt-4">
            <RunSummary
              runs={[
                { spec: RUN_A, result: resultA },
                ...(resultB ? [{ spec: RUN_B, result: resultB }] : []),
              ]}
            />
          </div>
        </div>

        <ExplanationPanel model={model} params={params} k={k} dosing={dosingA} />
      </section>
    </div>
  );
}

/**
 * Merge one or two runs into chart rows: { t, a, b }. Both runs share the
 * same time grid (same tEnd and dt), so rows line up index-by-index.
 *
 * Downsampling only affects drawing; the solver's accuracy is unchanged.
 * For the stepped drug chart, a coarse stride could skip short pulses, so
 * we keep any point where either concentration changes.
 */
function toRows(
  a: ScenarioResult,
  b: ScenarioResult | null,
  field: "N" | "C",
  logScale: boolean,
): ChartRow[] {
  const stride = Math.max(1, Math.ceil(a.t.length / MAX_CHART_POINTS));
  // Log axes can't show 0 or negatives; drop those points instead of breaking the axis.
  const clean = (v: number) => (logScale && v <= 0 ? null : v);

  const rows: ChartRow[] = [];
  for (let i = 0; i < a.t.length; i++) {
    const isLast = i === a.t.length - 1;
    const changes =
      field === "C" &&
      i > 0 &&
      (a.C[i] !== a.C[i - 1] || (b !== null && b.C[i] !== b.C[i - 1]));
    if (i % stride !== 0 && !isLast && !changes) continue;

    const row: ChartRow = { t: a.t[i], a: clean(a[field][i]) };
    if (b) row.b = clean(b[field][i]);
    rows.push(row);
  }
  return rows;
}
