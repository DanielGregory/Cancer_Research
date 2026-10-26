import { describe, expect, it } from "vitest";
import { exponential, gompertz, logistic } from "@/lib/models";
import { rk4Step, solveRK4 } from "./rk4";

/** Max absolute error of a solved trajectory against an exact solution. */
function maxError(t: number[], y: number[][], exact: (t: number) => number): number {
  return Math.max(...t.map((ti, i) => Math.abs(y[i][0] - exact(ti))));
}

describe("solveRK4 — accuracy against exact solutions", () => {
  it("matches exponential growth N0·e^(rt)", () => {
    const p = { r: 0.3 };
    const N0 = 10;
    const { t, y } = solveRK4({
      f: (_t, [N]) => [exponential.rate(N, p)],
      y0: [N0],
      tSpan: [0, 20],
      dt: 0.1,
    });
    const exact = (ti: number) => exponential.exactSolution!(ti, N0, p);
    // Relative error at the end: N(20) ≈ 4034, so this is ~1e-7 relative.
    expect(Math.abs(y.at(-1)![0] - exact(20)) / exact(20)).toBeLessThan(1e-6);
    expect(maxError(t, y, exact)).toBeLessThan(1e-3);
  });

  it("matches logistic growth K / (1 + ((K−N0)/N0)·e^(−rt))", () => {
    const p = { r: 0.2, K: 1000 };
    const N0 = 5;
    const { t, y } = solveRK4({
      f: (_t, [N]) => [logistic.rate(N, p)],
      y0: [N0],
      tSpan: [0, 80],
      dt: 0.1,
    });
    expect(maxError(t, y, (ti) => logistic.exactSolution!(ti, N0, p))).toBeLessThan(1e-4);
  });

  it("matches Gompertz growth K·exp(ln(N0/K)·e^(−rt))", () => {
    const p = { r: 0.1, K: 2000 };
    const N0 = 20;
    const { t, y } = solveRK4({
      f: (_t, [N]) => [gompertz.rate(N, p)],
      y0: [N0],
      tSpan: [0, 100],
      dt: 0.1,
    });
    expect(maxError(t, y, (ti) => gompertz.exactSolution!(ti, N0, p))).toBeLessThan(1e-4);
  });

  it("is fourth-order: halving dt cuts the error by about 2⁴ = 16×", () => {
    const p = { r: 1 };
    const errorAt = (dt: number) => {
      const { y } = solveRK4({
        f: (_t, [N]) => [exponential.rate(N, p)],
        y0: [1],
        tSpan: [0, 2],
        dt,
      });
      return Math.abs(y.at(-1)![0] - Math.exp(2));
    };
    const ratio = errorAt(0.1) / errorAt(0.05);
    expect(ratio).toBeGreaterThan(14);
    expect(ratio).toBeLessThan(18);
  });

  it("handles non-autonomous equations (f depends on t)", () => {
    // dy/dt = cos(t), y(0) = 0  →  y(t) = sin(t)
    const { t, y } = solveRK4({ f: (ti) => [Math.cos(ti)], y0: [0], tSpan: [0, 10], dt: 0.05 });
    expect(maxError(t, y, Math.sin)).toBeLessThan(1e-6);
  });
});

describe("solveRK4 — multi-dimensional state", () => {
  // Harmonic oscillator x'' = −x written as a 2D system [x, v]:
  //   dx/dt = v,  dv/dt = −x.  Exact: x = cos t, v = −sin t.
  // This exercises the array-valued state that multi-population models need.
  const oscillator = (_t: number, [x, v]: readonly number[]) => [v, -x];

  it("solves a coupled 2-variable system", () => {
    const { t, y } = solveRK4({ f: oscillator, y0: [1, 0], tSpan: [0, 10], dt: 0.01 });
    t.forEach((ti, i) => {
      expect(y[i][0]).toBeCloseTo(Math.cos(ti), 8);
      expect(y[i][1]).toBeCloseTo(-Math.sin(ti), 8);
    });
  });

  it("approximately conserves energy x² + v² over many periods", () => {
    // RK4 isn't exactly energy-conserving (it slowly dissipates), but with a
    // small step the drift over ~16 periods should be tiny.
    const { y } = solveRK4({ f: oscillator, y0: [1, 0], tSpan: [0, 100], dt: 0.01 });
    const energy = y.map(([x, v]) => x * x + v * v);
    const drift = Math.max(...energy.map((e) => Math.abs(e - 1)));
    expect(drift).toBeLessThan(1e-8);
  });
});

describe("solveRK4 — time grid and inputs", () => {
  const f = (_t: number, [N]: readonly number[]) => [N];

  it("starts at t0 and lands exactly on t1 even when dt doesn't divide the span", () => {
    const { t, y } = solveRK4({ f, y0: [1], tSpan: [0, 1], dt: 0.3 });
    expect(t).toHaveLength(5); // 0, 0.3, 0.6, 0.9, 1.0
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBe(1);
    expect(y).toHaveLength(t.length);
  });

  it("doesn't produce a spurious tiny last step from floating-point drift", () => {
    // 0.1 isn't exactly representable, so naive `while (t < 1) t += 0.1`
    // loops would take 11 steps here.
    const { t } = solveRK4({ f, y0: [1], tSpan: [0, 1], dt: 0.1 });
    expect(t).toHaveLength(11);
    expect(t.at(-1)).toBe(1);
  });

  it("returns just the initial point for a zero-length span", () => {
    expect(solveRK4({ f, y0: [3], tSpan: [5, 5], dt: 0.1 })).toEqual({ t: [5], y: [[3]] });
  });

  it("does not mutate the initial state", () => {
    const y0 = [1, 2];
    solveRK4({ f: (_t, y) => y.map((v) => v), y0, tSpan: [0, 1], dt: 0.1 });
    expect(y0).toEqual([1, 2]);
  });

  it("rejects a non-positive step size or reversed span", () => {
    expect(() => solveRK4({ f, y0: [1], tSpan: [0, 1], dt: 0 })).toThrow();
    expect(() => solveRK4({ f, y0: [1], tSpan: [1, 0], dt: 0.1 })).toThrow();
  });

  it("rk4Step with h = 0 leaves the state unchanged", () => {
    expect(rk4Step(f, 0, [7], 0)).toEqual([7]);
  });
});
