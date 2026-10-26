/**
 * Shared types for tumor growth models.
 *
 * A "growth model" here is the untreated growth law for a single population
 * of cells: a function g(N) giving dN/dt. Treatment is added on top of it
 * separately (see ./treatment.ts), so every growth law gets treatment for free.
 *
 * Growth models are deliberately plain data + pure functions. They don't
 * call the solver themselves; the scenario layer (/lib/scenario) turns them
 * into a DerivativeFn and hands that to the generic engine in /lib/sim.
 *
 * Looking ahead: multi-population models (e.g. drug-sensitive vs
 * drug-resistant cells) won't fit the single-N `rate(N)` shape. They will get
 * their own interface whose derivative works on a state vector, alongside
 * this one, rather than forcing everything through a single abstraction now.
 */

/** Every parameter a growth model might use. Individual models pick a subset. */
export interface GrowthParamValues {
  /** Intrinsic growth rate r, per day. */
  r: number;
  /** Carrying capacity K: the maximum size the environment can support (mm³). */
  K: number;
}

export type GrowthParamKey = keyof GrowthParamValues;

export type GrowthModelId = "exponential" | "logistic" | "gompertz";

/**
 * A single-population growth law dN/dt = rate(N, params).
 *
 * `P` is the model's own parameter type, so e.g. the exponential model can't
 * accidentally depend on K.
 */
export interface GrowthModel<P extends Partial<GrowthParamValues>> {
  id: GrowthModelId;
  name: string;
  /** The ODE in plain text, for display. */
  equation: string;
  /** One-line description. */
  summary: string;
  /** Plain-language paragraphs for the "What's happening" panel. */
  explanation: string[];
  /** Which parameters this model actually uses (drives which sliders are active). */
  paramKeys: readonly (keyof P & GrowthParamKey)[];
  /** Sensible defaults for this model's parameters. */
  defaults: P;
  /** The growth law itself: dN/dt for an untreated tumor of size N. */
  rate: (N: number, params: P) => number;
  /**
   * The closed-form solution N(t), when one exists. Used by tests to check
   * the solver, and handy for learning: compare the formula with the curve.
   */
  exactSolution?: (t: number, N0: number, params: P) => number;
  /**
   * Where the tumor ends up under a constant per-cell kill rate `kill` (= k·C),
   * i.e. the stable N* > 0 solving rate(N*) = kill·N*, or 0 if the drug wins.
   * Omitted for models with no finite steady state (exponential).
   */
  steadyState?: (params: P, kill: number) => number;
}
