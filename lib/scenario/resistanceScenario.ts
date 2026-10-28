import { createController, isAdaptive, totalExposure, type TreatmentPolicy } from "@/lib/dosing";
import { twoPopulation, type TwoPopulationParams } from "@/lib/models";
import { solveRK4 } from "@/lib/sim";

/**
 * Sensitive vs resistant tumor under a treatment policy (fixed or adaptive).
 *
 * The dosing controller is wired to the solver via `onPoint`: after every
 * step it sees the total burden S + R, and adaptive policies use that to
 * switch the drug on or off for the next step.
 */
export interface ResistanceScenario {
  params: TwoPopulationParams;
  /** Initial sensitive and resistant populations (mm³). */
  S0: number;
  R0: number;
  policy: TreatmentPolicy;
  tEnd: number;
  dt: number;
  /**
   * Progression = total burden rises above this multiple of the burden at
   * day 0. 1.2 (a 20% increase) loosely follows the clinical RECIST rule.
   */
  progressionFactor: number;
}

export interface ResistanceResult {
  t: number[];
  S: number[];
  R: number[];
  total: number[];
  /** Concentration in effect at each time point (for adaptive runs: the controller's decision). */
  C: number[];
  /** Total drug delivered over the whole run, ∫ C dt. */
  exposure: number;
  /**
   * Drug delivered up to progression (or the whole run if it never
   * progresses). In the clinic, a regimen is usually abandoned at
   * progression, so this is the fairer comparison.
   */
  exposureBeforeProgression: number;
  /** Burden level that counts as progression. */
  progressionLevel: number;
  /** First day the burden exceeds the progression level, or null if it never does. */
  timeToProgression: number | null;
}

export function runResistanceScenario(s: ResistanceScenario): ResistanceResult {
  const controller = createController(s.policy);

  const solution = solveRK4({
    f: (t, y) => twoPopulation.derivative(t, y, s.params, controller.concentration(t)),
    y0: [s.S0, s.R0],
    tSpan: [0, s.tEnd],
    dt: s.dt,
    onPoint: (t, [S, R]) => controller.observe(t, S + R),
  });

  const { t } = solution;
  const S = solution.y.map(([v]) => v);
  const R = solution.y.map(([, v]) => v);
  const total = S.map((v, i) => v + R[i]);

  // Re-create the concentration timeline. For adaptive runs, replay a fresh
  // controller over the same trajectory to recover its on/off decisions.
  const replay = createController(s.policy);
  const C = t.map((ti, i) => {
    replay.observe(ti, total[i]);
    return replay.concentration(ti);
  });

  const progressionLevel = s.progressionFactor * total[0];
  const idx = total.findIndex((v) => v > progressionLevel);
  const timeToProgression = idx === -1 ? null : t[idx];

  // Fixed schedules: exact area under C(t). Adaptive: C is constant over each
  // step (the controller only changes it between steps), so summing C·h is exact too.
  const exposureUntil = (tStop: number) =>
    isAdaptive(s.policy)
      ? t.slice(1).reduce((sum, ti, i) => (ti <= tStop ? sum + C[i] * (ti - t[i]) : sum), 0)
      : totalExposure(s.policy, 0, tStop);

  return {
    t,
    S,
    R,
    total,
    C,
    exposure: exposureUntil(s.tEnd),
    exposureBeforeProgression: exposureUntil(timeToProgression ?? s.tEnd),
    progressionLevel,
    timeToProgression,
  };
}
