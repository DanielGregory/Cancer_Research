import { concentrationAt, concentrationFn, totalExposure, type DosingSchedule } from "@/lib/dosing";
import { getGrowthModel, withTreatment, type GrowthModelId, type GrowthParamValues } from "@/lib/models";
import { solveRK4 } from "@/lib/sim";

/**
 * The glue layer: combine a growth model, a treatment, and a dosing schedule
 * into one ODE, solve it with the generic engine, and package the result.
 *
 * This is the only place that knows about all three. /lib/sim stays
 * disease-agnostic, and /lib/models and /lib/dosing don't know about each
 * other. New scenario types (two-population, parameter fitting, other
 * diseases) get their own files next to this one.
 */

export interface TumorScenario {
  modelId: GrowthModelId;
  /** Growth parameters. Models ignore the ones they don't use (e.g. exponential ignores K). */
  params: GrowthParamValues;
  /** Initial tumor size N(0). */
  N0: number;
  /** Drug kill rate k. */
  k: number;
  dosing: DosingSchedule;
  /** Simulate from day 0 to day tEnd. */
  tEnd: number;
  /** Solver step size, in days. */
  dt: number;
}

export interface ScenarioResult {
  t: number[];
  /** Tumor size N(t). */
  N: number[];
  /** Drug concentration C(t). */
  C: number[];
  /** Total drug delivered, ∫ C dt over the run. */
  exposure: number;
}

export function runTumorScenario(s: TumorScenario): ScenarioResult {
  const model = getGrowthModel(s.modelId);
  const growth = (N: number) => model.rate(N, s.params);
  const f = withTreatment(growth, s.k, concentrationFn(s.dosing));

  const solution = solveRK4({ f, y0: [s.N0], tSpan: [0, s.tEnd], dt: s.dt });

  return {
    t: solution.t,
    N: solution.y.map(([N]) => N),
    C: solution.t.map((t) => concentrationAt(s.dosing, t)),
    exposure: totalExposure(s.dosing, 0, s.tEnd),
  };
}
