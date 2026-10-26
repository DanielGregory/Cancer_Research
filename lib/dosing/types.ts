/**
 * A dosing schedule describes the drug concentration C(t) over time.
 *
 * Schedules are plain serializable data (a discriminated union on `kind`),
 * so they can be stored, compared, put in a URL, or fitted later. The
 * functions in ./schedules.ts turn them into C(t).
 *
 * Simplification: C(t) is set directly by the schedule. Real drugs are
 * absorbed and cleared over time (pharmacokinetics), so concentration rises
 * and decays smoothly rather than switching on and off. A PK model would be
 * a natural later addition: it would just be another state variable in the
 * ODE system.
 */
export type DosingSchedule = NoDosing | ConstantDosing | PulsedDosing;

export type DosingKind = DosingSchedule["kind"];

/** No treatment: C(t) = 0. */
export interface NoDosing {
  kind: "none";
}

/** Continuous infusion: C(t) = level for t ≥ start. */
export interface ConstantDosing {
  kind: "constant";
  /** Drug concentration while on treatment (arbitrary concentration units). */
  level: number;
  /** Day treatment begins. */
  start: number;
}

/**
 * On/off cycles: C(t) = dose during each "on" window, 0 during "off".
 * One full cycle (the dosing interval) lasts onDuration + offDuration days.
 */
export interface PulsedDosing {
  kind: "pulsed";
  /** Concentration during each "on" window. */
  dose: number;
  /** Length of each on window, in days. */
  onDuration: number;
  /** Rest period between pulses, in days. */
  offDuration: number;
  /** Day the first pulse begins. */
  start: number;
}
