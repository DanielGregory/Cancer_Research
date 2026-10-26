import type { DosingSchedule, PulsedDosing } from "./types";

/**
 * Drug concentration C(t) for a schedule at time t.
 */
export function concentrationAt(schedule: DosingSchedule, t: number): number {
  switch (schedule.kind) {
    case "none":
      return 0;
    case "constant":
      return t >= schedule.start ? schedule.level : 0;
    case "pulsed": {
      if (t < schedule.start) return 0;
      const period = cycleLength(schedule);
      if (period <= 0) return 0;
      // Where are we within the current cycle? 0 ≤ phase < period.
      const phase = (t - schedule.start) % period;
      return phase < schedule.onDuration ? schedule.dose : 0;
    }
  }
}

/** C(t) as a function, ready to plug into the treatment term. */
export function concentrationFn(schedule: DosingSchedule): (t: number) => number {
  return (t) => concentrationAt(schedule, t);
}

/**
 * Total drug exposure between t0 and t1: the area under C(t), ∫ C(t) dt.
 *
 * Computed exactly (no numerical integration). Useful for fair comparisons:
 * a constant schedule and a pulsed one with the same exposure deliver the
 * same total amount of drug, just distributed differently in time.
 */
export function totalExposure(schedule: DosingSchedule, t0: number, t1: number): number {
  return cumulativeExposure(schedule, t1) - cumulativeExposure(schedule, t0);
}

/** ∫ C(s) ds from −∞ to t. Every schedule is zero before it starts. */
function cumulativeExposure(schedule: DosingSchedule, t: number): number {
  switch (schedule.kind) {
    case "none":
      return 0;
    case "constant":
      return schedule.level * Math.max(0, t - schedule.start);
    case "pulsed": {
      const elapsed = t - schedule.start;
      const period = cycleLength(schedule);
      if (elapsed <= 0 || period <= 0) return 0;
      const fullCycles = Math.floor(elapsed / period);
      const remainder = elapsed - fullCycles * period;
      const timeOn = fullCycles * schedule.onDuration + Math.min(remainder, schedule.onDuration);
      return schedule.dose * timeOn;
    }
  }
}

/**
 * Long-run average concentration once treatment is under way. For pulsed
 * dosing that's dose × (fraction of each cycle spent on).
 */
export function averageConcentration(schedule: DosingSchedule): number {
  switch (schedule.kind) {
    case "none":
      return 0;
    case "constant":
      return schedule.level;
    case "pulsed": {
      const period = cycleLength(schedule);
      return period > 0 ? (schedule.dose * schedule.onDuration) / period : 0;
    }
  }
}

/** Length of one on+off cycle (the dosing interval). */
export function cycleLength(schedule: PulsedDosing): number {
  return schedule.onDuration + schedule.offDuration;
}
