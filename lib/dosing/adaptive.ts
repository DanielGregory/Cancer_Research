import { concentrationAt } from "./schedules";
import type { DosingSchedule } from "./types";

/**
 * Adaptive therapy: dosing that responds to the tumor.
 *
 * Based on the protocol used in the first adaptive therapy trial
 * (Zhang et al., Nature Communications 2017, prostate cancer):
 *   1. When treatment starts, record the tumor burden as the baseline.
 *   2. Treat at full dose until the burden falls below `stopBelow` × baseline
 *      (the trial used 50%).
 *   3. Stop, and wait until the burden regrows to `resumeAbove` × baseline
 *      (the trial used 100%).
 *   4. Repeat.
 *
 * Because there is a gap between the two thresholds, the drug's on/off
 * decision depends on history, not just the current size: a tumor at 70% of
 * baseline is treated if it's shrinking and not if it's regrowing. (This is
 * called hysteresis.) So adaptive dosing can't be a plain function C(t);
 * it's a small controller with memory, below.
 */
export interface AdaptiveDosing {
  kind: "adaptive";
  /** Concentration while dosing. */
  dose: number;
  /** Day treatment (and the baseline measurement) starts. */
  start: number;
  /** Pause when burden falls below this fraction of baseline (e.g. 0.5). */
  stopBelow: number;
  /** Resume when burden regrows to this fraction of baseline (e.g. 1.0). */
  resumeAbove: number;
}

/** Any way of deciding drug concentration: a fixed timetable or a feedback rule. */
export type TreatmentPolicy = DosingSchedule | AdaptiveDosing;

export type TreatmentKind = TreatmentPolicy["kind"];

/**
 * Something that supplies C(t) to the ODE and may watch the tumor between
 * solver steps. Connect it with `solveRK4({ ..., onPoint })`.
 */
export interface DosingController {
  /** Drug concentration at time t. */
  concentration(t: number): number;
  /** Report the measured tumor burden at time t (called between steps). */
  observe(t: number, burden: number): void;
}

export function isAdaptive(policy: TreatmentPolicy): policy is AdaptiveDosing {
  return policy.kind === "adaptive";
}

/** Build a controller for any treatment policy. Each call starts fresh. */
export function createController(policy: TreatmentPolicy): DosingController {
  if (!isAdaptive(policy)) {
    // A fixed timetable ignores the tumor entirely.
    return { concentration: (t) => concentrationAt(policy, t), observe: () => {} };
  }

  let baseline: number | null = null;
  let dosing = false;

  return {
    concentration: (t) => (t >= policy.start && dosing ? policy.dose : 0),

    observe: (t, burden) => {
      if (t < policy.start) return;
      if (baseline === null) {
        // First look at the tumor once treatment begins: set the baseline and start dosing.
        baseline = burden;
        dosing = true;
      } else if (dosing && burden < policy.stopBelow * baseline) {
        dosing = false;
      } else if (!dosing && burden >= policy.resumeAbove * baseline) {
        dosing = true;
      }
    },
  };
}
