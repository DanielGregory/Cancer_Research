"use client";

import { useMemo, useState } from "react";
import type { TreatmentPolicy } from "@/lib/dosing";
import { twoPopulation, type TwoPopulationParams } from "@/lib/models";
import { runResistanceScenario, type ResistanceResult } from "@/lib/scenario/resistanceScenario";
import { buildRows } from "../chartRows";
import { DosingControls } from "../controls/DosingControls";
import { Slider } from "../controls/Slider";
import { TimeSeriesChart, type SeriesSpec } from "../TimeSeriesChart";
import { ResistanceExplanation } from "./ResistanceExplanation";
import { ResistanceSummary } from "./ResistanceSummary";

const DT = 0.1;
const ALL_KINDS = ["none", "constant", "pulsed", "adaptive"] as const;

const RUN_A: SeriesSpec = { key: "a", name: "Run A", color: "var(--series-a)" };
const RUN_B: SeriesSpec = { key: "b", name: "Run B", color: "var(--series-b)", dashed: true };
const SENSITIVE: SeriesSpec = { key: "S", name: "Sensitive (S)", color: "var(--pop-s)" };
const RESISTANT: SeriesSpec = { key: "R", name: "Resistant (R)", color: "var(--pop-r)" };

export function ResistanceSimulator() {
  const [params, setParams] = useState<TwoPopulationParams>(twoPopulation.defaults);
  // Starting tumor described the way a clinician would: total size and % resistant.
  const [burden0, setBurden0] = useState(750);
  const [resistantPct, setResistantPct] = useState(0.7);
  const [progressionFactor, setProgressionFactor] = useState(1.2);
  const [tEnd, setTEnd] = useState(500);

  // The classic comparison: maximum tolerated dose (continuous) vs adaptive.
  const [policyA, setPolicyA] = useState<TreatmentPolicy>({ kind: "constant", level: 1, start: 0 });
  const [policyB, setPolicyB] = useState<TreatmentPolicy>({
    kind: "adaptive",
    dose: 1,
    stopBelow: 0.5,
    resumeAbove: 1,
    start: 0,
  });

  const R0 = burden0 * (resistantPct / 100);
  const S0 = burden0 - R0;

  const resultA = useMemo(
    () => runResistanceScenario({ params, S0, R0, policy: policyA, tEnd, dt: DT, progressionFactor }),
    [params, S0, R0, policyA, tEnd, progressionFactor],
  );
  const resultB = useMemo(
    () => runResistanceScenario({ params, S0, R0, policy: policyB, tEnd, dt: DT, progressionFactor }),
    [params, S0, R0, policyB, tEnd, progressionFactor],
  );

  const t = resultA.t;
  const burdenRows = useMemo(() => buildRows(t, { a: resultA.total, b: resultB.total }), [t, resultA, resultB]);
  const drugRows = useMemo(
    () => buildRows(t, { a: resultA.C, b: resultB.C }, { keepChanges: true }),
    [t, resultA, resultB],
  );

  const setParam = (key: keyof TwoPopulationParams, v: number) => setParams((p) => ({ ...p, [key]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ── Controls ─────────────────────────────────────────── */}
      <aside className="space-y-6 rounded-xl border border-border bg-surface-1 p-4">
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Cells</h2>
          <p className="font-mono text-xs leading-relaxed text-secondary">
            {twoPopulation.equations.map((eq) => (
              <span key={eq} className="block">
                {eq}
              </span>
            ))}
          </p>
          <Slider
            label="Sensitive growth rate"
            symbol="rS"
            unit="1/day"
            value={params.rS}
            min={0.005}
            max={0.2}
            step={0.005}
            onChange={(v) => setParam("rS", v)}
          />
          <Slider
            label="Resistant growth rate"
            symbol="rR"
            unit="1/day"
            value={params.rR}
            min={0.005}
            max={0.2}
            step={0.005}
            onChange={(v) => setParam("rR", v)}
            description="Usually lower than rS: resistance costs the cell energy."
          />
          <Slider
            label="Shared carrying capacity"
            symbol="K"
            unit="mm³"
            value={params.K}
            min={200}
            max={5000}
            step={50}
            onChange={(v) => setParam("K", v)}
          />
          <Slider
            label="Drug kill rate (sensitive only)"
            symbol="k"
            unit="1/(conc·day)"
            value={params.k}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => setParam("k", v)}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium">Starting tumor</h2>
          <Slider
            label="Initial burden"
            symbol="S₀+R₀"
            unit="mm³"
            value={burden0}
            min={10}
            max={params.K}
            step={10}
            onChange={setBurden0}
          />
          <Slider
            label="Initially resistant"
            unit="%"
            value={resistantPct}
            min={0.1}
            max={20}
            step={0.1}
            onChange={setResistantPct}
          />
          <Slider
            label="Progression at"
            unit="× initial burden"
            value={progressionFactor}
            min={1}
            max={2}
            step={0.05}
            onChange={setProgressionFactor}
            description="The tumor counts as progressing once it exceeds this multiple of its day-0 size."
          />
          <Slider
            label="Simulate for"
            unit="days"
            value={tEnd}
            min={50}
            max={1500}
            step={50}
            onChange={setTEnd}
          />
        </section>

        <DosingControls title="Run A treatment" color={RUN_A.color} kinds={ALL_KINDS} value={policyA} onChange={setPolicyA} />
        <DosingControls title="Run B treatment" color={RUN_B.color} dashed kinds={ALL_KINDS} value={policyB} onChange={setPolicyB} />
      </aside>

      {/* ── Results ──────────────────────────────────────────── */}
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h2 className="mb-2 text-sm font-semibold">Total tumor burden S + R</h2>
          <TimeSeriesChart
            data={burdenRows}
            series={[RUN_A, RUN_B]}
            yLabel="Volume (mm³)"
            height={300}
            referenceLines={[{ y: resultA.progressionLevel, label: "Progression" }]}
          />

          <h2 className="mt-4 mb-2 text-sm font-semibold">Drug concentration C(t)</h2>
          <TimeSeriesChart data={drugRows} series={[RUN_A, RUN_B]} yLabel="Conc." height={130} stepped />

          <div className="mt-4">
            <ResistanceSummary runs={[{ spec: RUN_A, result: resultA }, { spec: RUN_B, result: resultB }]} />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <CompositionChart title="Run A: who's in the tumor" result={resultA} />
          <CompositionChart title="Run B: who's in the tumor" result={resultB} />
        </div>

        <ResistanceExplanation
          runs={[
            { spec: RUN_A, policy: policyA, result: resultA },
            { spec: RUN_B, policy: policyB, result: resultB },
          ]}
        />
      </section>
    </div>
  );
}

function CompositionChart({ title, result }: { title: string; result: ResistanceResult }) {
  const rows = useMemo(() => buildRows(result.t, { S: result.S, R: result.R }), [result]);
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <TimeSeriesChart data={rows} series={[SENSITIVE, RESISTANT]} yLabel="Volume (mm³)" height={220} />
    </div>
  );
}
