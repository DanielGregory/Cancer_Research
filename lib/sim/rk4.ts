import type { DerivativeFn, Solution, SolveOptions, State } from "./types";

/**
 * Classic fourth-order Runge–Kutta (RK4).
 *
 * The idea: to step from y(t) to y(t + h) we need the slope of y, but the
 * slope changes during the step. Euler's method just uses the slope at the
 * start (k1) and is only first-order accurate. RK4 samples the slope four
 * times across the step and takes a weighted average:
 *
 *   k1 = f(t,       y)              slope at the start
 *   k2 = f(t + h/2, y + h/2 · k1)   slope at the midpoint, using k1 to get there
 *   k3 = f(t + h/2, y + h/2 · k2)   slope at the midpoint again, using the better k2
 *   k4 = f(t + h,   y + h · k3)     slope at the end, using k3 to get there
 *
 *   y(t + h) ≈ y + h/6 · (k1 + 2·k2 + 2·k3 + k4)
 *
 * The 1-2-2-1 weights are Simpson's rule. The local error per step is O(h⁵),
 * so the global error over a fixed interval is O(h⁴): halving h makes the
 * answer roughly 16× more accurate. (The tests check exactly this.)
 *
 * Caveat: the O(h⁴) guarantee assumes f is smooth. A pulsed drug schedule
 * switches on and off abruptly, so steps that straddle a switch are only
 * first-order accurate. With a small h relative to the pulse length this is
 * negligible, but it's worth knowing.
 */
export function rk4Step(f: DerivativeFn, t: number, y: State, h: number): number[] {
  const k1 = f(t, y);
  const k2 = f(t + h / 2, addScaled(y, k1, h / 2));
  const k3 = f(t + h / 2, addScaled(y, k2, h / 2));
  const k4 = f(t + h, addScaled(y, k3, h));

  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/**
 * Integrate dy/dt = f(t, y) from tSpan[0] to tSpan[1] with fixed step dt.
 *
 * Returns every intermediate point, which is what we want for plotting.
 * The final step is shortened if needed so the last time point is exactly
 * tSpan[1].
 */
export function solveRK4({ f, y0, tSpan, dt }: SolveOptions): Solution {
  const [t0, t1] = tSpan;
  if (!(dt > 0)) throw new Error(`dt must be positive, got ${dt}`);
  if (!(t1 >= t0)) throw new Error(`tSpan must satisfy t0 <= t1, got [${t0}, ${t1}]`);

  const t: number[] = [t0];
  const y: number[][] = [[...y0]];

  // Count steps up front instead of looping `while (time < t1)`: repeatedly
  // adding dt accumulates floating-point error and can produce a spurious
  // tiny extra step at the end.
  const nSteps = Math.ceil((t1 - t0) / dt - 1e-9);

  let state: number[] = [...y0];
  for (let i = 0; i < nSteps; i++) {
    const tStart = t0 + i * dt;
    const tEnd = i === nSteps - 1 ? t1 : t0 + (i + 1) * dt;
    state = rk4Step(f, tStart, state, tEnd - tStart);
    t.push(tEnd);
    y.push(state);
  }

  return { t, y };
}

/** Returns y + scale · v, element-wise, without mutating either input. */
function addScaled(y: State, v: State, scale: number): number[] {
  return y.map((yi, i) => yi + scale * v[i]);
}
