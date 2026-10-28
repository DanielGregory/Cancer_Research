import { describe, expect, it } from "vitest";
import { solveRK4 } from "@/lib/sim";
import { logistic, twoPopulation, withTreatment } from "./index";

const p = twoPopulation.defaults;

/** Solve the two-population model with a constant drug concentration C. */
function run(S0: number, R0: number, C: number, tEnd = 300, params = p) {
  return solveRK4({
    f: (t, y) => twoPopulation.derivative(t, y, params, C),
    y0: [S0, R0],
    tSpan: [0, tEnd],
    dt: 0.1,
  });
}

describe("two-population model", () => {
  it("with no resistant cells, reduces to treated logistic growth", () => {
    const C = 0.3;
    const two = run(100, 0, C);
    const one = solveRK4({
      f: withTreatment((N) => logistic.rate(N, { r: p.rS, K: p.K }), p.k, () => C),
      y0: [100],
      tSpan: [0, 300],
      dt: 0.1,
    });
    two.y.forEach(([S, R], i) => {
      expect(R).toBe(0);
      expect(S).toBeCloseTo(one.y[i][0], 9);
    });
  });

  it("resistant cells alone ignore the drug and grow logistically at rate rR", () => {
    const { t, y } = run(0, 10, 5);
    t.forEach((ti, i) => {
      expect(y[i][0]).toBe(0);
      expect(y[i][1]).toBeCloseTo(logistic.exactSolution!(ti, 10, { r: p.rR, K: p.K }), 4);
    });
  });

  it("the drug never appears in dR/dt", () => {
    const [, dR0] = twoPopulation.derivative(0, [300, 50], p, 0);
    const [, dR5] = twoPopulation.derivative(0, [300, 50], p, 5);
    expect(dR5).toBe(dR0);
  });

  it("populations share one carrying capacity: the total never exceeds K", () => {
    const { y } = run(400, 400, 0, 1000);
    for (const [S, R] of y) expect(S + R).toBeLessThanOrEqual(p.K + 1e-6);
    const [S, R] = y.at(-1)!;
    expect(S + R).toBeCloseTo(p.K, 3);
  });

  it("untreated, conserves ln(S/S0)/rS = ln(R/R0)/rR (both feel the same room factor)", () => {
    // Divide each equation by its population: d(ln S)/dt = rS·room and
    // d(ln R)/dt = rR·room. Same room, so ln(S/S0)/rS and ln(R/R0)/rR stay equal.
    const S0 = 50, R0 = 20;
    const { y } = run(S0, R0, 0, 400);
    for (const [S, R] of y) {
      expect(Math.log(S / S0) / p.rS).toBeCloseTo(Math.log(R / R0) / p.rR, 6);
    }
  });

  it("populations stay non-negative under heavy treatment", () => {
    const { y } = run(700, 5, 5, 500);
    for (const [S, R] of y) {
      expect(S).toBeGreaterThanOrEqual(0);
      expect(R).toBeGreaterThanOrEqual(0);
    }
  });

  it("competitive release: treatment makes resistant cells grow faster", () => {
    // Untreated, sensitive cells fill the space and hold R back.
    // Treated, S dies off and R expands into the freed space.
    const R_untreated = run(745, 5, 0, 200).y.at(-1)![1];
    const R_treated = run(745, 5, 1, 200).y.at(-1)![1];
    expect(R_treated).toBeGreaterThan(5 * R_untreated);
  });

  it("untreated, sensitive cells gain share while there's room, then the mix freezes at K", () => {
    // d/dt ln(S/R) = (rS − rR)·(1 − (S + R)/K): S's share grows only while space is free.
    const growing = run(100, 100, 0, 300).y.at(-1)!;
    expect(growing[0]).toBeGreaterThan(1.5 * growing[1]);

    // Already full: nobody grows, so the 50/50 mix stays put.
    const [S, R] = run(500, 500, 0, 300).y.at(-1)!;
    expect(S).toBeCloseTo(500, 9);
    expect(R).toBeCloseTo(500, 9);
  });
});
