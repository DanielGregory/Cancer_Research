import { describe, expect, it } from "vitest";
import { solveRK4 } from "@/lib/sim";
import { GROWTH_MODELS, exponential, gompertz, logistic, withTreatment } from "./index";

/** Solve an untreated growth model and return N(t) samples. */
function grow(rate: (N: number) => number, N0: number, tEnd = 200, dt = 0.1): number[] {
  return solveRK4({ f: (_t, [N]) => [rate(N)], y0: [N0], tSpan: [0, tEnd], dt }).y.map(([N]) => N);
}

const isNonDecreasing = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1] - 1e-9);
const isNonIncreasing = (xs: number[]) => xs.every((x, i) => i === 0 || x <= xs[i - 1] + 1e-9);

describe("growth models — biological sanity checks", () => {
  it.each(GROWTH_MODELS.map((m) => [m.id, m] as const))(
    "%s: an empty tumor stays empty (N = 0 is a fixed point)",
    (_id, model) => {
      expect(model.rate(0, { r: 0.2, K: 1000 })).toBe(0);
    },
  );

  it.each(GROWTH_MODELS.map((m) => [m.id, m] as const))(
    "%s: exact solution equals N0 at t = 0",
    (_id, model) => {
      expect(model.exactSolution!(0, 42, { r: 0.2, K: 1000 })).toBeCloseTo(42, 10);
    },
  );

  it.each([logistic, gompertz].map((m) => [m.id, m] as const))(
    "%s: N = K is an equilibrium (growth stops at carrying capacity)",
    (_id, model) => {
      expect(model.rate(1000, { r: 0.2, K: 1000 })).toBeCloseTo(0, 12);
    },
  );

  it.each([logistic, gompertz].map((m) => [m.id, m] as const))(
    "%s: starting below K, grows monotonically toward K without overshooting",
    (_id, model) => {
      const p = { r: 0.2, K: 1000 };
      const N = grow((n) => model.rate(n, p), 10);
      expect(isNonDecreasing(N)).toBe(true);
      expect(Math.max(...N)).toBeLessThanOrEqual(p.K + 1e-6);
      expect(N.at(-1)).toBeCloseTo(p.K, 2);
    },
  );

  it.each([logistic, gompertz].map((m) => [m.id, m] as const))(
    "%s: starting above K, shrinks monotonically back to K",
    (_id, model) => {
      const p = { r: 0.2, K: 1000 };
      const N = grow((n) => model.rate(n, p), 1500);
      expect(isNonIncreasing(N)).toBe(true);
      expect(Math.min(...N)).toBeGreaterThanOrEqual(p.K - 1e-6);
      expect(N.at(-1)).toBeCloseTo(p.K, 2);
    },
  );

  it("exponential: doubles every ln(2)/r days", () => {
    const r = 0.1;
    const doublingTime = Math.log(2) / r;
    const { y } = solveRK4({
      f: (_t, [N]) => [exponential.rate(N, { r })],
      y0: [1],
      tSpan: [0, doublingTime],
      dt: 0.01,
    });
    expect(y.at(-1)![0]).toBeCloseTo(2, 8);
  });

  it("logistic: growth is fastest at K/2; Gompertz: fastest at K/e", () => {
    const K = 1000;
    const argmax = (rate: (N: number) => number) => {
      let best = 0;
      for (let N = 1; N < K; N++) if (rate(N) > rate(best)) best = N;
      return best;
    };
    expect(argmax((N) => logistic.rate(N, { r: 0.1, K }))).toBe(K / 2);
    expect(argmax((N) => gompertz.rate(N, { r: 0.1, K }))).toBe(Math.round(K / Math.E));
  });

  it("for N ≪ K, logistic growth looks exponential", () => {
    const p = { r: 0.1, K: 1e9 };
    expect(logistic.rate(10, p)).toBeCloseTo(exponential.rate(10, p), 6);
  });
});

describe("withTreatment", () => {
  it("with zero drug, reduces to the untreated growth law", () => {
    const growth = (N: number) => logistic.rate(N, { r: 0.2, K: 1000 });
    const f = withTreatment(growth, 0.5, () => 0);
    expect(f(3, [400])).toEqual([growth(400)]);
  });

  it("exponential + constant drug has exact solution N0·e^((r − kC)t)", () => {
    const r = 0.1, k = 0.15, C = 1, N0 = 100;
    const f = withTreatment((N) => exponential.rate(N, { r }), k, () => C);
    const { t, y } = solveRK4({ f, y0: [N0], tSpan: [0, 50], dt: 0.1 });
    t.forEach((ti, i) => {
      expect(y[i][0]).toBeCloseTo(N0 * Math.exp((r - k * C) * ti), 6);
    });
  });

  it("a stronger drug never leaves a bigger tumor", () => {
    const growth = (N: number) => gompertz.rate(N, { r: 0.1, K: 2000 });
    const finalSize = (k: number) =>
      solveRK4({ f: withTreatment(growth, k, () => 1), y0: [100], tSpan: [0, 60], dt: 0.1 }).y.at(-1)![0];
    const sizes = [0, 0.05, 0.1, 0.2, 0.4].map(finalSize);
    expect(isNonIncreasing(sizes)).toBe(true);
  });

  it.each([exponential, logistic].map((m) => [m.id, m] as const))(
    "%s: heavy treatment drives the tumor toward 0 but never below it",
    (_id, model) => {
      const f = withTreatment((N) => model.rate(N, { r: 0.1, K: 2000 }), 0.5, () => 2);
      const { y } = solveRK4({ f, y0: [500], tSpan: [0, 100], dt: 0.1 });
      const N = y.map(([n]) => n);
      expect(Math.min(...N)).toBeGreaterThanOrEqual(0);
      expect(N.at(-1)!).toBeLessThan(1e-6 * 500);
    },
  );

  it("gompertz: constant treatment can't eradicate; tumor settles at K·e^(−kC/r)", () => {
    // Setting r·N·ln(K/N) = k·C·N gives ln(K/N) = kC/r, so N* = K·exp(−kC/r).
    // Gompertz per-cell growth r·ln(K/N) → ∞ as N → 0, so any constant kill is
    // eventually outpaced by a small enough tumor.
    const r = 0.1, K = 2000, k = 0.5, C = 2;
    const f = withTreatment((N) => gompertz.rate(N, { r, K }), k, () => C);
    const { y } = solveRK4({ f, y0: [500], tSpan: [0, 300], dt: 0.1 });
    const expected = K * Math.exp((-k * C) / r);
    expect(y.at(-1)![0]).toBeGreaterThan(0);
    expect(Math.abs(y.at(-1)![0] - expected) / expected).toBeLessThan(1e-6);
  });

  it.each([logistic, gompertz].map((m) => [m.id, m] as const))(
    "%s: steadyState() predicts where the simulation ends up",
    (_id, model) => {
      const p = { r: 0.1, K: 2000 };
      for (const kill of [0, 0.03, 0.08]) {
        const f = withTreatment((N) => model.rate(N, p), kill, () => 1);
        const final = solveRK4({ f, y0: [100], tSpan: [0, 600], dt: 0.1 }).y.at(-1)![0];
        const expected = model.steadyState!(p, kill);
        // Approach is slow when kill ≈ r, so compare relatively.
        expect(Math.abs(final - expected) / expected).toBeLessThan(1e-4);
      }
    },
  );

  it("logistic: steadyState() is 0 once the kill rate exceeds r", () => {
    expect(logistic.steadyState!({ r: 0.1, K: 2000 }, 0.15)).toBe(0);
  });
});
