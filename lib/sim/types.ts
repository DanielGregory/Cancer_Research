/**
 * Core types for the ODE engine.
 *
 * Nothing in /lib/sim knows about tumors, drugs, or biology. It only knows
 * how to integrate a system of ordinary differential equations
 *
 *     dy/dt = f(t, y),   y(t0) = y0
 *
 * where y is a vector (array) of state variables. A one-population tumor
 * model has y = [N]; a later two-population model will have
 * y = [sensitive, resistant]; a protein-spread model might have one entry
 * per brain region. The solver treats them all the same way.
 */

/** The state vector y. One number per state variable. */
export type State = readonly number[];

/**
 * The right-hand side f(t, y) of dy/dt = f(t, y).
 * Must return an array the same length as `y`, and must not mutate `y`.
 */
export type DerivativeFn = (t: number, y: State) => number[];

/** Inputs to a fixed-step solver run. */
export interface SolveOptions {
  /** The derivative function f(t, y). */
  f: DerivativeFn;
  /** Initial state y(t0). */
  y0: State;
  /** Integrate from tSpan[0] to tSpan[1]. */
  tSpan: readonly [number, number];
  /** Step size h. The final step is shortened so we land exactly on tSpan[1]. */
  dt: number;
  /**
   * Optional observer, called with every output point as it is computed,
   * starting with (t0, y0) and then after each step.
   *
   * This is how feedback control plugs in without the solver knowing about
   * it: a controller can look at the state between steps and change
   * something that `f` reads (e.g. switch a drug on or off). Whatever it
   * sets is then held fixed for the whole next step, so each step still
   * integrates a smooth equation.
   */
  onPoint?: (t: number, y: State) => void;
}

/**
 * A computed trajectory: `t[i]` is a time point and `y[i]` is the state
 * vector at that time. `y[i][j]` is state variable j at time t[i].
 */
export interface Solution {
  t: number[];
  y: number[][];
}
